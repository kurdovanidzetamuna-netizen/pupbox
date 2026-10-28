import type { MetadataRoute } from 'next';

/** "Add to home screen": name, colours and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pupbox — ყოველთვიური ყუთი შენი ძაღლისთვის',
    short_name: 'Pupbox',
    description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების ყოველთვიური კოლოფი. მიწოდება მთელ საქართველოში.',
    start_url: '/ka',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#178573',
    lang: 'ka',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
