from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("gps", "0002_configuracionvehiculo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gpsposicion",
            name="timestamp",
            field=models.DateTimeField(
                default=django.utils.timezone.now,
                db_index=True,
            ),
        ),
    ]
