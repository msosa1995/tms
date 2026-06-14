# TMS — Sistema de Gestión de Transporte de Cargas

Sistema empresarial para la administración y control operativo-financiero de transporte de fletes. Desarrollado con Django 5, React 18, PostgreSQL y Grafana.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend API | Django 5 + DRF + JWT |
| Frontend | React 18 + Vite + TypeScript |
| Base de datos | PostgreSQL 16 |
| Caché / Colas | Redis 7 |
| Tareas async | Celery + Celery Beat |
| BI / Dashboards | Grafana 10 |
| Proxy | Nginx |
| Contenedores | Docker Compose |

## Requisitos previos

- Docker Desktop (Windows/Mac) o Docker Engine + Compose v2 (Linux)
- 4 GB RAM mínimo disponible para Docker
- Puertos libres: 80, 3000, 5432, 6379

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone <url-repositorio>
cd tms

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con contraseñas seguras

# 3. Construir imágenes
make build

# 4. Levantar servicios
make up

# 5. Aplicar migraciones
make migrate

# 6. Cargar datos iniciales de prueba
make seed
```

El sistema queda disponible en:

- **Aplicación:** http://localhost
- **API REST:** http://localhost/api/v1/
- **Documentación API (Swagger):** http://localhost/api/docs/
- **Documentación API (ReDoc):** http://localhost/api/redoc/
- **Grafana:** http://localhost/grafana/ (o http://localhost:3000)
- **Admin Django:** http://localhost/admin/

## Usuarios de prueba (tras ejecutar `make seed`)

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | admin@tms.local | Admin1234! | Administrador |
| Carlos Rodríguez | supervisor@tms.local | Supervisor1! | Supervisor |
| Ana González | operador@tms.local | Operador1! | Operador |
| Luis Martínez | auditor@tms.local | Auditor1! | Auditor |

## Módulos del sistema

### Gestión operativa
- **Vehículos** — ABM completo con historial de kilometraje y estado
- **Choferes** — Gestión de conductores con licencias y estado
- **Clientes** — Base de clientes con RUC paraguayo
- **Viajes** — Registro de itinerarios con estados y transiciones
- **Mantenimiento** — Control preventivo/correctivo con alertas automáticas

### Gestión financiera
- **Ingresos** — Facturación por flete con soporte PYG
- **Gastos** — 9 categorías operativas con comprobantes
- **Dashboard** — KPIs en tiempo real (ingresos, gastos, rentabilidad)
- **Analytics** — Proyecciones ML con regresión polinómica

### Reportes y exportación
- PDF con diseño profesional (ReportLab)
- Excel con formato y estilos (openpyxl)
- CSV compatible con Excel en español

### Seguridad y auditoría
- Roles: Administrador, Supervisor, Operador, Auditor
- Registro automático de todas las acciones
- Tracking de IP de acceso
- Bloqueo por intentos fallidos (django-axes)

## API REST

La API sigue el estándar REST con versionado en `/api/v1/`. Autenticación via JWT Bearer token.

### Endpoints principales

```
POST   /api/v1/auth/token/              Obtener tokens
POST   /api/v1/auth/token/refresh/      Renovar token
POST   /api/v1/auth/logout/             Invalidar token

GET    /api/v1/dashboard/               KPIs dashboard
GET    /api/v1/vehiculos/               Listado vehículos
GET    /api/v1/viajes/                  Listado viajes
POST   /api/v1/viajes/{id}/iniciar/     Iniciar viaje
POST   /api/v1/viajes/{id}/finalizar/   Finalizar con km
GET    /api/v1/ingresos/resumen-mensual/ Resumen mensual
GET    /api/v1/gastos/por-categoria/    Gastos por categoría
GET    /api/v1/analytics/indicadores-financieros/
GET    /api/v1/analytics/rentabilidad-clientes/
GET    /api/v1/analytics/rentabilidad-rutas/
GET    /api/v1/analytics/flujo-caja/
GET    /api/v1/reportes/pdf/            Exportar PDF
GET    /api/v1/reportes/excel/          Exportar Excel
GET    /api/v1/reportes/csv/?tipo=      Exportar CSV
GET    /api/v1/audit-log/              Registros de auditoría
```

### Filtros disponibles

Todos los endpoints soportan filtros por query params:
```
?fecha_desde=2024-01-01&fecha_hasta=2024-12-31
?cliente=1&chofer=2&estado=finalizado
?search=texto_libre
?ordering=-fecha (prefijo - para descendente)
?page=1&page_size=50
```

## Grafana

Al acceder a Grafana (admin / contraseña definida en .env), encontrarás:

- **Dashboard Ejecutivo** — Ingresos vs gastos, top clientes, rentabilidad por ruta
- **Dashboard Operativo** — Viajes por período, km recorridos
- **Dashboard Predictivo** — Proyecciones de flujo de caja

El datasource PostgreSQL se configura automáticamente via provisionamiento.

## Comandos útiles

```bash
make up             # Levantar todo
make down           # Detener todo
make logs           # Ver logs en tiempo real
make shell          # Django shell
make test           # Ejecutar tests (con cobertura)
make db-backup      # Backup de la base de datos
make restart        # Reiniciar backend sin bajar DB/Redis
```

## Estructura del proyecto

```
tms/
├── docker-compose.yml
├── .env.example
├── Makefile
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── tms_project/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── apps/
│   │   │   ├── accounts/       # Usuarios + RBAC
│   │   │   ├── vehiculos/
│   │   │   ├── choferes/
│   │   │   ├── clientes/
│   │   │   ├── viajes/
│   │   │   ├── ingresos/
│   │   │   ├── gastos/
│   │   │   ├── mantenimiento/
│   │   │   ├── auditoria/
│   │   │   ├── reportes/
│   │   │   └── analytics/
│   │   ├── core/
│   │   │   ├── permissions.py  # RBAC
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── signals.py      # Auditoría automática
│   │   │   ├── middleware.py
│   │   │   └── pagination.py
│   │   └── urls.py
│   ├── scripts/
│   │   └── seed_data.py
│   └── tests/
├── frontend/
│   └── src/
├── grafana/
│   ├── dashboards/
│   └── provisioning/
└── nginx/
    └── nginx.conf
```

## Próximos pasos

Para completar el sistema antes del primer despliegue:

1. **Frontend React** — Crear componentes para cada módulo
2. **Migrar datos del Excel** — Una vez disponible el Excel completo
3. **Configurar email** — SMTP en .env para alertas de mantenimiento
4. **Ajustar contraseñas** — Cambiar todos los valores por defecto en .env
5. **Backup automático** — Agregar cronjob de `make db-backup` al servidor

## Soporte para múltiples vehículos

El sistema está diseñado para escalar. Todos los modelos tienen FK a `Vehiculo`, los dashboards filtran por vehículo, y los reportes soportan filtro por vehículo desde el primer día. Para agregar un segundo camión solo se crea un nuevo `Vehiculo` en el sistema.
