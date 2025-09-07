import { Database } from '../config/database';

export interface Migration {
  id: string;
  name: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

export abstract class BaseMigration implements Migration {
  abstract id: string;
  abstract name: string;
  abstract up(db: Database): Promise<void>;
  abstract down(db: Database): Promise<void>;
}
