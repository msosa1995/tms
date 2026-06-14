"""
apps/mantenimiento/models.py
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class TipoMantenimiento(models.TextChoices):
    PREVENTIVO = "preventivo", _("Preventivo")
    CORRECTIVO = "correctivo", _("Correctivo")
    PREDICTIVO = "predictivo", _("Predictivo")


class Mantenimiento(models.Model):
    vehiculo = models.ForeignKey(
        "vehiculos.Vehiculo",
        on_delete=models.PROTECT,
        related_name="mantenimientos",
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoMantenimiento.choices,
        db_index=True,
    )
    descripcion = models.CharField(max_length=500)
    fecha = models.DateField(db_index=True)
    kilometraje = models.PositiveIntegerField()
    proveedor = models.CharField(max_length=200)
    costo = models.DecimalField(max_digits=18, decimal_places=2)
    moneda = models.CharField(max_length=3, default="PYG")
    numero_orden = models.CharField(max_length=100, blank=True)
    proximo_mantenimiento_fecha = models.DateField(null=True, blank=True)
    proximo_mantenimiento_km = models.PositiveIntegerField(null=True, blank=True)
    alerta_enviada = models.BooleanField(default=False)
    comprobante = models.FileField(upload_to="mantenimiento/", null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="mantenimientos_registrados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("mantenimiento")
        verbose_name_plural = _("mantenimientos")
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["vehiculo", "fecha"]),
            models.Index(fields=["proximo_mantenimiento_fecha"]),
        ]

    def __str__(self):
        return f"{self.vehiculo} — {self.get_tipo_display()} — {self.fecha}"
