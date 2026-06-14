from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = "tms_project.apps.accounts"
    verbose_name = "Cuentas y Usuarios"

    def ready(self):
        from tms_project.core import signals  # noqa
