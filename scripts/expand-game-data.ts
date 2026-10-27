import { db } from '../src/lib/db';
import { importGameData } from './import-game-data';

importGameData().finally(() => db.$disconnect());
