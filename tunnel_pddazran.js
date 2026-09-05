import localtunnel from 'localtunnel';

async function start() {
  console.log('Starting localtunnel for subdomain: pddazran...');
  try {
    const tunnel = await localtunnel({ port: 3000, subdomain: 'pddazran' });
    console.log('SUCCESS: TUNNEL_URL=' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3s...');
      setTimeout(start, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err);
    setTimeout(start, 5000);
  }
}

start();
