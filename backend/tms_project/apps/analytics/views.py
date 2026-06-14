"""
apps/analytics/views.py — Indicadores financieros y proyecciones ML
"""
import logging
import numpy as np
import pandas as pd
from datetime import date, timedelta
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures

from tms_project.apps.ingresos.models import Ingreso, Gasto
from tms_project.apps.viajes.models import Viaje, EstadoViaje

logger = logging.getLogger("tms")


class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_serie_mensual(self, modelo, campo_fecha="fecha", campo_valor="monto", meses=12):
        """
        Retorna serie histórica mensual de un modelo como DataFrame.
        """
        hoy = date.today()
        inicio = (hoy.replace(day=1) - pd.DateOffset(months=meses)).date()

        qs = (
            modelo.objects
            .filter(**{f"{campo_fecha}__gte": inicio})
            .annotate(mes=TruncMonth(campo_fecha))
            .values("mes")
            .annotate(total=Sum(campo_valor))
            .order_by("mes")
        )
        df = pd.DataFrame(list(qs))
        if df.empty:
            return pd.DataFrame(columns=["mes", "total"])

        # Rellenar meses sin datos con 0
        idx = pd.date_range(start=inicio, end=hoy, freq="MS")
        df["mes"] = pd.to_datetime(df["mes"])
        df = df.set_index("mes").reindex(idx, fill_value=0).reset_index()
        df.columns = ["mes", "total"]
        return df

    def _proyectar(self, serie: pd.DataFrame, meses_futuros: int = 6):
        """
        Regresión polinómica grado 2 sobre serie histórica.
        Devuelve dict con proyecciones y métricas.
        """
        if len(serie) < 3:
            return {"error": "Datos insuficientes para proyección (mínimo 3 meses)."}

        X = np.arange(len(serie)).reshape(-1, 1)
        y = serie["total"].values.astype(float)

        poly = PolynomialFeatures(degree=2, include_bias=False)
        X_poly = poly.fit_transform(X)

        modelo = LinearRegression()
        modelo.fit(X_poly, y)

        # R²
        r2 = modelo.score(X_poly, y)

        # Proyección
        X_fut = np.arange(len(serie), len(serie) + meses_futuros).reshape(-1, 1)
        X_fut_poly = poly.transform(X_fut)
        proyecciones = modelo.predict(X_fut_poly)

        # Fechas futuras
        ultima_fecha = serie["mes"].iloc[-1]
        fechas_futuras = [
            (ultima_fecha + pd.DateOffset(months=i + 1)).strftime("%Y-%m")
            for i in range(meses_futuros)
        ]

        return {
            "r2_score": round(float(r2), 4),
            "proyecciones": [
                {"mes": mes, "valor_proyectado": max(0, round(float(val), 2))}
                for mes, val in zip(fechas_futuras, proyecciones)
            ],
        }

    @action(detail=False, methods=["get"], url_path="indicadores-financieros")
    def indicadores_financieros(self, request):
        """KPIs financieros con datos históricos y proyecciones."""
        meses = int(request.query_params.get("meses", 12))
        meses_fut = int(request.query_params.get("meses_futuros", 6))

        serie_ing = self._get_serie_mensual(Ingreso, meses=meses)
        serie_gas = self._get_serie_mensual(Gasto, meses=meses)

        # Combinar en un DataFrame
        df = serie_ing.rename(columns={"total": "ingresos"})
        df["gastos"] = serie_gas["total"].values if not serie_gas.empty else 0
        df["ganancia"] = df["ingresos"] - df["gastos"]
        df["margen_pct"] = np.where(
            df["ingresos"] > 0,
            (df["ganancia"] / df["ingresos"] * 100).round(2),
            0,
        )

        historico = []
        for _, row in df.iterrows():
            historico.append({
                "mes": row["mes"].strftime("%Y-%m"),
                "ingresos": float(row["ingresos"]),
                "gastos": float(row["gastos"]),
                "ganancia": float(row["ganancia"]),
                "margen_pct": float(row["margen_pct"]),
            })

        proyeccion_ingresos = self._proyectar(serie_ing, meses_fut)
        proyeccion_gastos = self._proyectar(serie_gas, meses_fut)

        # ROI operativo
        total_ing = float(serie_ing["total"].sum())
        total_gas = float(serie_gas["total"].sum())
        roi = round((total_ing - total_gas) / total_gas * 100, 2) if total_gas else 0

        return Response({
            "historico_mensual": historico,
            "proyeccion_ingresos": proyeccion_ingresos,
            "proyeccion_gastos": proyeccion_gastos,
            "roi_operativo_periodo": roi,
            "total_ingresos_periodo": total_ing,
            "total_gastos_periodo": total_gas,
            "ganancia_total_periodo": total_ing - total_gas,
        })

    @action(detail=False, methods=["get"], url_path="rentabilidad-clientes")
    def rentabilidad_clientes(self, request):
        """Rentabilidad por cliente: ingresos, gastos asociados y margen."""
        from tms_project.apps.clientes.models import Cliente

        clientes = Cliente.objects.filter(activo=True)
        resultado = []
        for cliente in clientes:
            ingresos = cliente.ingresos.aggregate(t=Sum("monto"))["t"] or 0
            gastos = Gasto.objects.filter(
                viaje__cliente=cliente
            ).aggregate(t=Sum("monto"))["t"] or 0
            ganancia = float(ingresos) - float(gastos)
            margen = round(ganancia / float(ingresos) * 100, 2) if ingresos else 0
            resultado.append({
                "cliente_id": cliente.id,
                "razon_social": cliente.razon_social,
                "ingresos": float(ingresos),
                "gastos_asociados": float(gastos),
                "ganancia": ganancia,
                "margen_pct": margen,
                "viajes": cliente.viajes.filter(estado=EstadoViaje.FINALIZADO).count(),
            })
        resultado.sort(key=lambda x: x["ganancia"], reverse=True)
        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="rentabilidad-rutas")
    def rentabilidad_rutas(self, request):
        """Rentabilidad agrupada por ruta (origen-destino)."""
        viajes = Viaje.objects.filter(estado=EstadoViaje.FINALIZADO)
        rutas = {}
        for v in viajes:
            ruta = f"{v.origen} → {v.destino}"
            if ruta not in rutas:
                rutas[ruta] = {"ruta": ruta, "viajes": 0, "ingresos": 0, "gastos": 0, "km": 0}
            rutas[ruta]["viajes"] += 1
            rutas[ruta]["ingresos"] += float(v.total_ingresos)
            rutas[ruta]["gastos"] += float(v.total_gastos)
            rutas[ruta]["km"] += v.distancia_recorrida or 0

        resultado = []
        for r in rutas.values():
            r["ganancia"] = r["ingresos"] - r["gastos"]
            r["margen_pct"] = round(r["ganancia"] / r["ingresos"] * 100, 2) if r["ingresos"] else 0
            r["costo_km"] = round(r["gastos"] / r["km"], 4) if r["km"] else 0
            resultado.append(r)

        resultado.sort(key=lambda x: x["ganancia"], reverse=True)
        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="flujo-caja")
    def flujo_caja(self, request):
        """Flujo de caja histórico + proyección."""
        meses = int(request.query_params.get("meses", 12))
        meses_fut = int(request.query_params.get("meses_futuros", 3))

        serie_ing = self._get_serie_mensual(Ingreso, meses=meses)
        serie_gas = self._get_serie_mensual(Gasto, meses=meses)

        # Flujo = ingresos acumulados - gastos acumulados
        ing = serie_ing["total"].values.astype(float)
        gas = serie_gas["total"].values.astype(float) if not serie_gas.empty else np.zeros(len(ing))
        flujo = ing - gas
        flujo_acum = np.cumsum(flujo)

        historico = [
            {
                "mes": row["mes"].strftime("%Y-%m"),
                "ingresos": float(ing[i]),
                "gastos": float(gas[i]),
                "flujo_neto": float(flujo[i]),
                "flujo_acumulado": float(flujo_acum[i]),
            }
            for i, row in serie_ing.iterrows()
        ]

        # Serie de flujo neto para proyectar
        serie_flujo = serie_ing.copy()
        serie_flujo["total"] = flujo
        proyeccion = self._proyectar(serie_flujo, meses_fut)

        return Response({
            "historico": historico,
            "proyeccion_flujo": proyeccion,
        })
