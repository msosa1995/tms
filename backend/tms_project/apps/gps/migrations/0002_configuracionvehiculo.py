from django.db import migrations, models


def insertar_config_hbk137(apps, schema_editor):
    ConfiguracionVehiculo = apps.get_model("gps", "ConfiguracionVehiculo")
    ConfiguracionVehiculo.objects.get_or_create(
        dispositivo="HBK137",
        defaults={
            "odometro_base_km": 104050,
            "km_ultimo_mantenimiento": 100000,
            "intervalo_mantenimiento_km": 5000,
            "descripcion_mantenimiento": "Cambio de aceite y filtros",
            "consumo_l_100km": 25.0,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("gps", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConfiguracionVehiculo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dispositivo", models.CharField(default="HBK137", max_length=50, unique=True)),
                ("odometro_base_km", models.FloatField(default=0)),
                ("km_ultimo_mantenimiento", models.FloatField(default=0)),
                ("intervalo_mantenimiento_km", models.FloatField(default=5000)),
                ("descripcion_mantenimiento", models.CharField(default="Cambio de aceite y filtros", max_length=200)),
                ("consumo_l_100km", models.FloatField(default=25.0)),
                ("fecha_config", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Configuración de vehículo", "app_label": "gps"},
        ),
        migrations.RunPython(insertar_config_hbk137, migrations.RunPython.noop),
    ]
