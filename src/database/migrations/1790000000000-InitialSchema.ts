import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id VARCHAR(36) NOT NULL,
        name VARCHAR(150) NOT NULL,
        stock INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY UQ_products_name (name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id VARCHAR(36) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id),
        UNIQUE KEY UQ_users_username (username)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id VARCHAR(36) NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        status ENUM(
          'PENDING',
          'PROCESSED',
          'FAILED'
        ) NOT NULL DEFAULT 'PENDING',
        failure_reason VARCHAR(255) NULL,
        processed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id),

        INDEX IDX_orders_status (status),
        INDEX IDX_orders_created_at (created_at)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE order_items (
        id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (id),

        INDEX IDX_order_items_order_id (order_id),
        INDEX IDX_order_items_product_id (product_id),

        CONSTRAINT FK_order_items_order
          FOREIGN KEY (order_id)
          REFERENCES orders(id)
          ON DELETE CASCADE,

        CONSTRAINT FK_order_items_product
          FOREIGN KEY (product_id)
          REFERENCES products(id)
          ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE order_items');

    await queryRunner.query('DROP TABLE orders');

    await queryRunner.query('DROP TABLE users');

    await queryRunner.query('DROP TABLE products');
  }
}
