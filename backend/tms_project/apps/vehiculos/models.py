"""
apps/vehiculos/models.py
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class EstadoVehiculo(models.TextChoices):
    ACTIVO = "activo", _("Activo")
    EN_MANTENIMIENTO = "mantenimiento", _("En mantenimiento")
    INACTIVO = "inactivo", _("Inactivo")


class Vehiculo(models.Model):
    patente = models.CharField(max_length=20, unique=True, db_index=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.PositiveSmallIntegerField()
    capacidad_kg = models.DecimalField(max_digits=10, decimal_places=2)
    numero_chasis = models.CharField(max_length=50, unique=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoVehiculo.choices,
        default=EstadoVehiculo.ACTIVO,
        db_index=True,
    )
    foto = models.ImageField(upload_to="vehiculos/", null=True, blank=True)
    observaciones = models.TextField(blank=True)
    fecha_alta = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("vehículo")
        verbose_name_plural = _("vehículos")
        ordering = ["patente"]

    def __str__(self):
        return f"{self.patente} — {self.marca} {self.modelo} ({self.anio})"

    @property
    def kilometraje_actual(self):
        ultimo = self.viajes.filter(estado="finalizado").order_by("-km_finales").first()
        return ultimo.km_finales if ultimo else 0
