from rest_framework.views import exception_handler
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            "status_code": response.status_code,
            "errors": response.data,
        }
        if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            custom_data["message"] = "Autenticación requerida."
        response.data = custom_data

    return response
