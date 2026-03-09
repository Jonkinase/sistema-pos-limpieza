export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDatabase } = await import('./lib/db/database');
    try {
      await initDatabase();
      console.log('✅ Base de datos inicializada desde instrumentation.ts');
    } catch (error) {
      console.error('❌ Error al inicializar la base de datos desde instrumentation.ts:', error);
    }
  }
}
