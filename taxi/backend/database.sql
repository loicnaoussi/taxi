-- Création de la base de données
CREATE DATABASE IF NOT EXISTS taxi_app;
USE taxi_app;

-- Table des utilisateurs (passagers & chauffeurs)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone_number VARCHAR(20) UNIQUE,
    profile_image_url VARCHAR(255),
    user_type ENUM('driver', 'passenger', 'driver') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des véhicules (chauffeurs uniquement)
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    make VARCHAR(50),
    model VARCHAR(50),
    year INT CHECK (year >= 2000),
    license_plate VARCHAR(20) UNIQUE,
    color VARCHAR(20),
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des trajets
CREATE TABLE IF NOT EXISTS rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    driver_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    pickup_time DATETIME,
    dropoff_time DATETIME,
    status ENUM('requested', 'accepted', 'in_progress', 'completed', 'canceled') DEFAULT 'requested',
    fare DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES users(user_id),
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'credit_card', 'mobile_payment'),
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

-- Table des QR Codes (vérification des utilisateurs)
CREATE TABLE IF NOT EXISTS qr_codes (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    qr_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des codes de sécurité chauffeurs
CREATE TABLE IF NOT EXISTS driver_codes (
    code_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    security_code VARCHAR(6) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des contacts d’urgence
CREATE TABLE IF NOT EXISTS emergency_contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des évaluations et avis
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id),
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des vérifications d'identité (CNI, vidéo, photo, carte grise)
CREATE TABLE IF NOT EXISTS user_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    photo_url VARCHAR(255),
    video_url VARCHAR(255),
    cni_url VARCHAR(255),
    vehicle_registration_url VARCHAR(255), -- Carte grise (pour chauffeurs)
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table des localisations GPS
CREATE TABLE IF NOT EXISTS user_location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_fare DECIMAL(10,2) NOT NULL DEFAULT 5.00,  -- Tarif de base
    cost_per_km DECIMAL(10,2) NOT NULL DEFAULT 1.50, -- Coût par kilomètre
    max_distance_km INT NOT NULL DEFAULT 100,        -- Distance maximale en km
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issue_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ride_id INT NOT NULL,
    issue_type VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

CREATE DATABASE taxi_app_test;


