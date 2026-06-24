from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingresos", "0002_cargacombustible"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gasto",
            name="categoria",
            field=models.CharField(
                choices=[
                    ("combustible", "Combustible"),
                    ("peajes", "Peajes"),
                    ("viaticos", "Viáticos"),
                    ("reparaciones", "Reparaciones"),
                    ("neumaticos", "Neumáticos"),
                    ("mantenimiento", "Mantenimiento"),
                    ("seguros", "Seguros"),
                    ("impuestos", "Impuestos"),
                    ("sueldo", "Sueldo"),
                    ("otros", "Otros"),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
    ]
