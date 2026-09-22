import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProducts1790000001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO products (
        id,
        name,
        stock
      )
      VALUES
        (UUID(), 'Mouse', 5),
        (UUID(), 'Keyboard', 5),
        (UUID(), 'Monitor', 5),
        (UUID(), 'Headset', 5)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM products
      WHERE name IN (
        'Mouse',
        'Keyboard',
        'Monitor',
        'Headset'
      )
    `);
  }
}
