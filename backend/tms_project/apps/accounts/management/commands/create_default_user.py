from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Crea el usuario por defecto sosaro si no existe"

    def handle(self, *args, **options):
        User = get_user_model()
        if User.objects.filter(username="sosaro").exists():
            self.stdout.write("Usuario sosaro ya existe.")
            return
        User.objects.create_superuser(
            username="sosaro",
            email="sosaro@tms.local",
            password="sosaro4x4",
            first_name="Rodrigo",
            last_name="Sosa",
            rol="administrador",
        )
        self.stdout.write(self.style.SUCCESS("Usuario sosaro creado exitosamente."))
