"""
apps/clientes/models.py
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class Cliente(models.Model):
    razon_social = models.CharField(max_length=200)
    ruc = models.CharField(max_length=20, unique=True, db_index=True)
    contacto = models.CharField(max_length=150, blank=True)
    telefono = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    direccion = models.TextField()
    activo = models.BooleanField(default=True, db_index=True)
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("cliente")
        verbose_name_plural = _("clientes")
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} (RUC: {self.ruc})"
