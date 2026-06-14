"""
apps/viajes/models.py
"""
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class EstadoViaje(models.TextChoices):
    PROGRAMADO = "programado", _("Programado")
    EN_CURSO = "en_curso", _("En curso")
    FINALIZADO = "finalizado", _("Finalizado")
    CANCELADO = "cancelado", _("Cancelado")


class Viaje(models.Model):
    numero_viaje = models.CharField(max_length=20, unique=True, db_index=True, editable=False)
    vehiculo = models.ForeignKey(
        "vehiculos.Vehiculo",
        on_delete=models.PROTECT,
        related_name="viajes",
    )
    chofer = models.ForeignKey(
        "choferes.Chofer",
        on_delete=models.PROTECT,
        related_name="viajes",
    )
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="viajes",
    )
    fecha_salida = models.DateField(db_index=True)
    fecha_regreso = models.DateField(null=True, blank=True)
    origen = models.CharField(max_length=200)
    destino = models.CharField(max_length=200)
    km_iniciales = models.PositiveIntegerField()
    km_finales = models.PositiveIntegerField(null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoViaje.choices,
        default=EstadoViaje.PROGRAMADO,
        db_index=True,
    )
    carga_descripcion = models.CharField(max_length=500, blank=True)
    carga_peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="viajes_creados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("viaje")
        verbose_name_plural = _("viajes")
        ordering = ["-fecha_salida"]
        indexes = [
            models.Index(fields=["estado", "fecha_salida"]),
            models.Index(fields=["vehiculo", "estado"]),
            models.Index(fields=["chofer", "fecha_salida"]),
        ]

    def __str__(self):
        return f"{self.numero_viaje} — {self.origen} → {self.destino}"

    def save(self, *args, **kwargs):
        if not self.numero_viaje:
            self.numero_viaje = self._generar_numero()
        self.full_clean()
        super().save(*args, **kwargs)

    def _generar_numero(self):
        from django.utils import timezone
        anio = timezone.now().year
        ultimo = Viaje.objects.filter(
            numero_viaje__startswith=f"VJ-{anio}-"
        ).order_by("-numero_viaje").first()
        if ultimo:
            try:
                ultimo_num = int(ultimo.numero_viaje.split("-")[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"VJ-{anio}-{ultimo_num + 1:05d}"

    def clean(self):
        if self.km_finales and self.km_finales <= self.km_iniciales:
            raise ValidationError({
                "km_finales": _("Los km finales deben ser mayores a los iniciales.")
            })
        if self.fecha_regreso and self.fecha_regreso < self.fecha_salida:
            raise ValidationError({
                "fecha_regreso": _("La fecha de regreso no puede ser anterior a la salida.")
            })

    @property
    def distancia_recorrida(self):
        if self.km_finales:
            return self.km_finales - self.km_iniciales
        return None

    @property
    def total_ingresos(self):
        return self.ingresos.aggregate(
            total=models.Sum("monto")
        )["total"] or 0

    @property
    def total_gastos(self):
        return self.gastos.aggregate(
            total=models.Sum("monto")
        )["total"] or 0

    @property
    def rentabilidad(self):
        return self.total_ingresos - self.total_gastos

    @property
    def costo_por_km(self):
        if self.distancia_recorrida and self.distancia_recorrida > 0:
            return self.total_gastos / self.distancia_recorrida
        return None
