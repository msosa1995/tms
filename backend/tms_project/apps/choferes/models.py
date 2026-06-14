"""
apps/choferes/models.py
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class EstadoChofer(models.TextChoices):
    ACTIVO = "activo", _("Activo")
    DE_LICENCIA = "licencia", _("De licencia")
    INACTIVO = "inactivo", _("Inactivo")


class Chofer(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    documento = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    direccion = models.TextField()
    licencia_numero = models.CharField(max_length=50, blank=True)
    licencia_vencimiento = models.DateField(null=True, blank=True)
    fecha_ingreso = models.DateField()
    estado = models.CharField(
        max_length=20,
        choices=EstadoChofer.choices,
        default=EstadoChofer.ACTIVO,
        db_index=True,
    )
    foto = models.ImageField(upload_to="choferes/", null=True, blank=True)
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("chofer")
        verbose_name_plural = _("choferes")
        ordering = ["apellido", "nombre"]

    def __str__(self):
        return f"{self.apellido}, {self.nombre} — DNI: {self.documento}"

    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"
