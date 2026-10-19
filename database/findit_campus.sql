-- FindIT Campus final XAMPP schema (safe import: no DROP TABLE statements)
-- For local classroom testing only. Default first-install admin: admin / 1234. Change immediately.
CREATE DATABASE IF NOT EXISTS findit_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE findit_campus;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(60) NULL UNIQUE,
  student_id VARCHAR(80) NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  program VARCHAR(120) NULL,
  year_level VARCHAR(20) NULL,
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

-- Upgrade an earlier project database without deleting existing accounts.
SET @findit_has_year_level = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='findit_campus' AND TABLE_NAME='users' AND COLUMN_NAME='year_level');
SET @findit_sql = IF(@findit_has_year_level = 0, 'ALTER TABLE users ADD COLUMN year_level VARCHAR(20) NULL AFTER program', 'SELECT 1');
PREPARE findit_stmt FROM @findit_sql; EXECUTE findit_stmt; DEALLOCATE PREPARE findit_stmt;

CREATE TABLE IF NOT EXISTS items (
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

CREATE TABLE IF NOT EXISTS handover_records (
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

CREATE TABLE IF NOT EXISTS activity_logs (
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

CREATE TABLE IF NOT EXISTS login_attempts (
  login_key VARCHAR(191) NOT NULL,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (login_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recycle_bin (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type ENUM('item','account','handover') NOT NULL,
  original_id BIGINT UNSIGNED NULL,
  payload_json LONGTEXT NOT NULL,
  deleted_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recycle_type_date (entity_type, deleted_at),
  CONSTRAINT fk_recycle_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Safely upgrade an older recycle_bin enum to support archived handover history.
SET @findit_recycle_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='findit_campus' AND TABLE_NAME='recycle_bin' AND COLUMN_NAME='entity_type' LIMIT 1);
SET @findit_sql = IF(@findit_recycle_type IS NOT NULL AND @findit_recycle_type NOT LIKE '%handover%', "ALTER TABLE recycle_bin MODIFY entity_type ENUM('item','account','handover') NOT NULL", 'SELECT 1');
PREPARE findit_stmt FROM @findit_sql; EXECUTE findit_stmt; DEALLOCATE PREPARE findit_stmt;

CREATE TABLE IF NOT EXISTS connection_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_label VARCHAR(30) NOT NULL,
  test_token CHAR(32) NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_connection_test_sent (sent_at)
) ENGINE=InnoDB;

INSERT INTO users (username, full_name, password_hash, role, status, consent_privacy)
SELECT 'admin', 'School Administrator', '$2y$12$LIe.j3D/qbW64rOj6/rjp.gGc.Kn6k4DRHNXTIbue8WWWTVLAexkG', 'admin', 'approved', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='admin');

-- No sample student records or sample item reports are inserted. Create them through the application.
