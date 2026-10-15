
TravelPay Wallet
TravelPay Wallet is a university FinTech MVP combining a multi-currency digital wallet, travel expense management, simulated QR payments, cybersecurity controls, fraud detection, and spending analytics.

Demo only: Wallet balances and payments are simulated. This project must not process real customer funds or store payment-card credentials without appropriate licensed partners and compliance work.

Technology stack
Layer	Technology
Backend	Laravel (PHP), Laravel Herd, REST API
Database	MySQL 8 in Docker
Cache / queues	Redis in Docker
Database UI	phpMyAdmin in Docker
Mobile (planned)	Flutter
Admin dashboard (planned)	React
The Flutter and React applications may not yet be initialized. Check their directories before running frontend commands.

Project structure
Travel Pay/
├── backend/             # Existing Laravel application
├── mobile/              # Flutter application (when initialized)
├── admin/               # React admin application (when initialized)
├── docker-compose.yml   # Docker services
└── README.md
Prerequisites (Windows)
Docker Desktop with Linux containers enabled and the engine running
Laravel Herd (PHP and Composer available in PowerShell)
Git (recommended)
Flutter SDK and Android Studio / emulator for mobile development (later)
Node.js and npm for the admin application (later)
Check the installed tools:

docker --version
docker compose version
php -v
composer -V
1. Start Docker services
Open PowerShell in the project root (where docker-compose.yml exists):

cd "C:\Users\MSI\OneDrive - Khazar University\Desktop\Travel Pay"
dir
docker compose up -d
docker compose ps
The development Compose setup previously used for this project exposes:

Service	Local address
MySQL	127.0.0.1:3307
phpMyAdmin	http://localhost:8080
Redis	127.0.0.1:6379
If the ports differ in your actual docker-compose.yml, use the ports in that file. docker compose ps shows the published ports.

Important: Do not run docker compose down -v unless you intentionally want to delete Docker-managed data volumes.

2. Configure the Laravel backend
Open the backend folder:

cd backend
If the Laravel project already exists, do not recreate it. Install dependencies only if necessary:

composer install
If .env does not exist, copy the example:

Copy-Item .env.example .env
php artisan key:generate
Do not overwrite an existing .env or regenerate an existing APP_KEY without understanding the consequences: changing the key can invalidate encrypted application data and sessions.

Set the following values in backend/.env, using your own local credentials:

APP_NAME="TravelPay Wallet"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://travelpay.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=travelpay
DB_USERNAME=travelpay_user
DB_PASSWORD=YOUR_LOCAL_MYSQL_PASSWORD

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
The earlier development example used travelpay123 for MYSQL_PASSWORD, but use the password that is actually configured in your MySQL instance. Do not commit credentials to Git.

When Laravel runs on Windows through Herd, use 127.0.0.1:3307 for MySQL. DB_HOST=mysql and port 3306 are appropriate only when Laravel runs in a container on the same Docker Compose network.

Clear cached Laravel configuration:

php artisan config:clear
3. Verify database access and run migrations
First verify Docker MySQL is running:

docker compose ps
Check the Laravel database connection and migration status:

php artisan migrate:status
If the connection works and you have reviewed the pending migrations, run:

php artisan migrate
This creates or updates tables defined by the existing Laravel migrations. It does not automatically create all TravelPay-specific tables unless their migrations have been implemented.

Open http://localhost:8080 and select the travelpay database to inspect the tables. The phpMyAdmin server is typically mysql (inside the Docker network); sign in with your configured MySQL user and password.

4. Open Laravel with Herd
From the backend directory:

herd link travelpay
Then visit:

http://travelpay.test

If the site was linked previously, you do not need to link it again. When Herd serves the project, you do not need to run php artisan serve.

5. Common errors
no configuration file provided: not found
Run Docker Compose from the folder containing docker-compose.yml. Ensure the filename is docker-compose.yml, not docker-composer.yml or docker-compose.yml.txt.

Get-ChildItem -Force
docker compose -f .\docker-compose.yml up -d
Docker API / dockerDesktopLinuxEngine not found
Open Docker Desktop, wait until the engine is running, and check:

docker info
Access denied for user 'travelpay_user'@'localhost'
Confirm DB_HOST=127.0.0.1, DB_PORT=3307, and the correct database credentials in backend/.env.
Run php artisan config:clear.
Confirm the MySQL port mapping with docker compose ps.
Check the credentials directly against the container:
docker exec -it travelpay_mysql mysql -u travelpay_user -p
Enter your password when prompted. Do not paste passwords into shared terminal logs.

If login succeeds inside Docker but fails from Laravel, check whether port 3307 is published and whether another local MySQL service is being reached. If the credentials are rejected, inspect the MySQL users with an administrator account and correct the user password/grants without deleting the database. Changing MYSQL_PASSWORD in Compose does not update credentials in an already initialized MySQL volume.

phpMyAdmin login fails
Open http://localhost:8080, use the database username/password configured in MySQL, and check docker compose ps. phpMyAdmin may connect to the server named mysql internally.

6. Planned development modules
Module	Functionality
Authentication	Registration, login, Sanctum, email verification, 2FA
Wallet	Demo AZN/EUR/USD balances, transfers, transaction history
Accounting	Double-entry ledger, atomic transfers, idempotency
Travel	Trips, budgets, categorized expenses
Payments	Simulated QR payment requests and confirmations
Security	Device tracking, audit events, fraud scoring, alerts
Analytics	Spending reports and travel expense charts
Mobile	Flutter screens consuming the Laravel API
Admin	React dashboard for authorized administrators
Suggested development order: verify the database connection → implement authentication and migrations → wallet/ledger → travel expenses → QR demo payments → security and analytics → Flutter mobile app → React admin dashboard → automated tests.

7. Start the project on subsequent days
# From the Travel Pay project root
docker compose up -d

# Laravel runs automatically through Herd when Herd is active.
# Open http://travelpay.test
# Open http://localhost:8080 for phpMyAdmin
To stop the containers without deleting the MySQL volume:

docker compose down
Security and collaboration notes
Keep backend/.env and real credentials out of version control.
Use test balances and mock payment providers only.
Never store card CVV or full card data in this MVP.
Use integer minor units or precise decimal arithmetic for money, not floats.
Enforce authorization and fraud decisions on the backend.
Run automated tests against an isolated testing database, not your development database.
Current setup status
Based on the setup completed so far, Docker, MySQL, phpMyAdmin, Laravel, and Herd have been started successfully. Successful Laravel-to-MySQL migration and the implementation of the TravelPay modules have not yet been verified.
