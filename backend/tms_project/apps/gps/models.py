from django.db import models


class ConfiguracionVehiculo(models.Model):
    """Parámetros del vehículo para calcular mantenimiento y autonomía."""
    dispositivo              = models.CharField(max_length=50, unique=True, default="HBK137")
    odometro_base_km         = models.FloatField(default=0, help_text="Km del odómetro cuando empezamos a trackear GPS")
    km_ultimo_mantenimiento  = models.FloatField(default=0)
    intervalo_mantenimiento_km = models.FloatField(default=5000)
    descripcion_mantenimiento  = models.CharField(max_length=200, default="Cambio de aceite y filtros")
    consumo_l_100km          = models.FloatField(default=25.0)
    fecha_config             = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "gps"
        verbose_name = "Configuración de vehículo"

    def __str__(self):
        return f"Config {self.dispositivo}"


class GpsPosicion(models.Model):
    dispositivo = models.CharField(max_length=50, db_index=True)
    lat = models.FloatField()
    lng = models.FloatField()
    estado = models.CharField(max_length=50, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        app_label = "gps"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["dispositivo", "timestamp"], name="gps_posicion_dev_ts_idx"),
        ]

    def __str__(self):
        return f"{self.dispositivo} @ {self.timestamp:%Y-%m-%d %H:%M}"
