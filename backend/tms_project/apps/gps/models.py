from django.db import models


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
