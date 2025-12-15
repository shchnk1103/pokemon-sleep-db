
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key. Make sure they are set in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getTableSchema(tableName) {
  const { data, error } = await supabase.rpc('get_table_schema_details', {
    p_table_name: tableName,
    p_schema_name: 'public', // Assuming 'public' schema
  });

  if (error) {
    console.error(`Error fetching schema for table ${tableName}:`, error);
    return null;
  }

  return { [tableName]: data };
}

async function main() {
  const tableNames = [
    'berries',
    'ingredients',
    'natures',
    'pokemon_dex',
    'pokemon_ingredient_unlocks',
    'pokemon_ingredient_unlocks_details',
  ];

  const schemas = await Promise.all(tableNames.map(getTableSchema));

  console.log(JSON.stringify(schemas.filter(s => s), null, 2));
}

main();
