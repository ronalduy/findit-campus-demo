-- FindIT Campus - MySQL/MariaDB schema for XAMPP
-- Import this file using phpMyAdmin. Demo admin login: username admin, password 1234.
-- Change the demo password before any real or public deployment.
CREATE DATABASE IF NOT EXISTS findit_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE findit_campus;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS handover_records;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(60) NULL UNIQUE,
  student_id VARCHAR(80) NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  program VARCHAR(120) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','student') NOT NULL DEFAULT 'student',
  status ENUM('pending','approved','rejected','correction_required') NOT NULL DEFAULT 'pending',
  id_photo_path VARCHAR(255) NULL,
  selfie_photo_path VARCHAR(255) NULL,
  review_note VARCHAR(500) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  consent_privacy TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_users_status_role (role, status),
  CONSTRAINT fk_users_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_code VARCHAR(32) NOT NULL UNIQUE,
  item_type ENUM('lost','found') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  location_found_or_lost VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  image_path VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_items_type_status (item_type, status),
  KEY idx_items_category (category),
  KEY idx_items_event_date (event_date),
  CONSTRAINT fk_items_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE handover_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  linked_lost_item_id BIGINT UNSIGNED NULL,
  claimant_type ENUM('student','staff','other') NOT NULL DEFAULT 'student',
  claimant_name VARCHAR(160) NOT NULL,
  claimant_student_id VARCHAR(80) NULL,
  released_by BIGINT UNSIGNED NOT NULL,
  handover_notes VARCHAR(1000) NULL,
  released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_handovers_released_at (released_at),
  CONSTRAINT fk_handover_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_handover_lost_item FOREIGN KEY (linked_lost_item_id) REFERENCES items(id) ON DELETE SET NULL,
  CONSTRAINT fk_handover_released_by FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action_name VARCHAR(100) NOT NULL,
  target_type VARCHAR(80) NULL,
  target_id BIGINT UNSIGNED NULL,
  details VARCHAR(500) NULL,
  ip_address VARCHAR(45) NULL,
  activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_time (activity_at),
  KEY idx_activity_actor (actor_user_id),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  login_key VARCHAR(191) NOT NULL,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (login_key)
) ENGINE=InnoDB;

-- Admin demo account. Password hash is for the password "1234".
INSERT INTO users (username, full_name, password_hash, role, status, consent_privacy)
VALUES ('admin', 'School Administrator', '$2y$12$LIe.j3D/qbW64rOj6/rjp.gGc.Kn6k4DRHNXTIbue8WWWTVLAexkG', 'admin', 'approved', 1);

-- Optional fictional sample records to make the first dashboard easier to demonstrate.
INSERT INTO items (reference_code, item_type, title, description, category, location_found_or_lost, event_date, image_path, status, created_by)
VALUES
('FD-2026-0001', 'found', 'Blue water bottle', 'Blue reusable water bottle found after class. Sample record only.', 'Bottle', 'Library entrance', '2026-10-15', NULL, 'available_for_claim', 1),
('LS-2026-0001', 'lost', 'Black pencil case', 'Black pencil case with pens inside. Sample record only.', 'School supplies', 'Room 204', '2026-10-14', NULL, 'open', 1),
('FD-2026-0002', 'found', 'Small umbrella', 'Foldable navy umbrella found near the covered court. Sample record only.', 'Accessories', 'Covered court', '2026-10-13', NULL, 'available_for_claim', 1);
