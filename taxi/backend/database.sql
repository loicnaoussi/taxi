-- 📌 Création de la base de données principale
CREATE DATABASE IF NOT EXISTS taxi_app;
USE taxi_app;

-- 📌 Table des utilisateurs (passagers, chauffeurs, admins)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    profile_image_url VARCHAR(255),
    user_type ENUM('driver', 'passenger', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📌 Table des véhicules (chauffeurs uniquement)
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    marque VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT CHECK (year >= 2000),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    immatriculation VARCHAR(20) UNIQUE NOT NULL,
    couleur VARCHAR(20) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    carte_grise VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des trajets
CREATE TABLE IF NOT EXISTS rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    pickup_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    dropoff_time DATETIME NULL,
    status ENUM('requested', 'accepted', 'in_progress', 'completed', 'canceled') DEFAULT 'requested',
    fare DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL
);

-- 📌 Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'credit_card', 'mobile_payment') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

-- 📌 Table des contacts d’urgence
CREATE TABLE IF NOT EXISTS emergency_contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des évaluations et avis
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des QR Codes (identification des utilisateurs)
CREATE TABLE IF NOT EXISTS qr_codes (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    qr_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des localisations GPS
CREATE TABLE IF NOT EXISTS user_location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Table des paramètres de l’application
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    base_fare DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    cost_per_km DECIMAL(10,2) NOT NULL DEFAULT 1.50,
    max_distance_km INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 📌 Table des signalements et réclamations
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

-- ✅ 📌 Correction : Ajout de la table `verifications` pour la vérification d'identité
CREATE TABLE IF NOT EXISTS verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_video VARCHAR(255) NOT NULL,
    cni_front VARCHAR(255) NOT NULL,
    cni_back VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 📌 Insertion des utilisateurs par défaut
INSERT INTO users (username, email, password_hash, full_name, phone_number, user_type) VALUES
('admin', 'admin@example.com', 'hashed_password', 'Admin System', '0611111111', 'admin'),
('driver1', 'driver1@example.com', 'hashed_password', 'John Doe', '0622222222', 'driver'),
('passenger1', 'passenger1@example.com', 'hashed_password', 'Jane Doe', '0633333333', 'passenger');

-- 📌 Insertion des véhicules par défaut
INSERT INTO vehicles (driver_id, marque, model, year, license_plate, immatriculation, couleur, status) VALUES
(2, 'Toyota', 'Corolla', 2020, 'AB-123-CD', 'ABC-123', 'Bleu', 'active'),
(2, 'Renault', 'Clio', 2019, 'XY-456-ZT', 'XYZ-456', 'Noir', 'inactive');

-- 📌 Insertion des trajets par défaut
INSERT INTO rides (passenger_id, driver_id, vehicle_id, pickup_location, dropoff_location, pickup_time, status, fare) VALUES
(3, 2, 1, 'Paris', 'Lyon', NOW(), 'completed', 50.00),
(3, 2, 2, 'Marseille', 'Nice', NOW(), 'canceled', 35.00);

-- 📌 Insertion des paramètres par défaut
INSERT INTO settings (base_fare, cost_per_km, max_distance_km) VALUES (5.00, 1.50, 100);

