from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="GpsPosicion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dispositivo", models.CharField(db_index=True, max_length=50)),
                ("lat", models.FloatField()),
                ("lng", models.FloatField()),
                ("estado", models.CharField(blank=True, max_length=50)),
                ("timestamp", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "ordering": ["-timestamp"],
            },
        ),
        migrations.AddIndex(
            model_name="gpsposicion",
            index=models.Index(fields=["dispositivo", "timestamp"], name="gps_posicion_dev_ts_idx"),
        ),
    ]
