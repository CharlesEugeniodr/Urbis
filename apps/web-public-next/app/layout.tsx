import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata={title:'URBIS Transparência',description:'Painel público anonimizado do URBIS'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
