"""
apps/ingresos/models.py
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class FormaPago(models.TextChoices):
    EFECTIVO = "efectivo", _("Efectivo")
    TRANSFERENCIA = "transferencia", _("Transferencia bancaria")
    CHEQUE = "cheque", _("Cheque")
    CREDITO = "credito", _("Crédito")


class Ingreso(models.Model):
    viaje = models.ForeignKey(
        "viajes.Viaje",
        on_delete=models.PROTECT,
        related_name="ingresos",
        null=True,
        blank=True,
    )
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="ingresos",
    )
    fecha = models.DateField(db_index=True)
    monto = models.DecimalField(max_digits=18, decimal_places=2)
    moneda = models.CharField(max_length=3, default="PYG")
    forma_pago = models.CharField(max_length=20, choices=FormaPago.choices)
    numero_factura = models.CharField(max_length=50, blank=True)
    comprobante = models.FileField(upload_to="ingresos/comprobantes/", null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="ingresos_registrados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("ingreso")
        verbose_name_plural = _("ingresos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["fecha"]),
            models.Index(fields=["cliente", "fecha"]),
        ]

    def __str__(self):
        return f"Ingreso {self.id} — {self.cliente} — {self.monto} {self.moneda}"


class CargaCombustible(models.Model):
    fecha = models.DateField(db_index=True)
    litros = models.DecimalField(max_digits=8, decimal_places=2)
    monto = models.DecimalField(max_digits=18, decimal_places=2)
    observaciones = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="cargas_combustible"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "carga de combustible"
        verbose_name_plural = "cargas de combustible"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.fecha} — {self.litros}L — ₲{self.monto}"


class CategoriaGasto(models.TextChoices):
    COMBUSTIBLE = "combustible", _("Combustible")
    PEAJES = "peajes", _("Peajes")
    VIATICOS = "viaticos", _("Viáticos")
    REPARACIONES = "reparaciones", _("Reparaciones")
    NEUMATICOS = "neumaticos", _("Neumáticos")
    MANTENIMIENTO = "mantenimiento", _("Mantenimiento")
    SEGUROS = "seguros", _("Seguros")
    IMPUESTOS = "impuestos", _("Impuestos")
    SUELDO = "sueldo", _("Sueldo")
    OTROS = "otros", _("Otros")


class Gasto(models.Model):
    viaje = models.ForeignKey(
        "viajes.Viaje",
        on_delete=models.PROTECT,
        related_name="gastos",
        null=True,
        blank=True,
    )
    vehiculo = models.ForeignKey(
        "vehiculos.Vehiculo",
        on_delete=models.PROTECT,
        related_name="gastos",
        null=True,
        blank=True,
        help_text=_("Para gastos sin viaje asociado (seguros, impuestos, etc.)")
    )
    fecha = models.DateField(db_index=True)
    categoria = models.CharField(
        max_length=20,
        choices=CategoriaGasto.choices,
        db_index=True,
    )
    monto = models.DecimalField(max_digits=18, decimal_places=2)
    moneda = models.CharField(max_length=3, default="PYG")
    numero_comprobante = models.CharField(max_length=100, blank=True)
    comprobante = models.FileField(upload_to="gastos/comprobantes/", null=True, blank=True)
    descripcion = models.TextField()
    proveedor = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="gastos_registrados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("gasto")
        verbose_name_plural = _("gastos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["categoria", "fecha"]),
            models.Index(fields=["viaje", "categoria"]),
        ]

    def __str__(self):
        return f"{self.get_categoria_display()} — {self.monto} {self.moneda} ({self.fecha})"
