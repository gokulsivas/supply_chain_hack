// Save as: backend/src/sockets/index.ts
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { prisma } from '../config/prisma';

export let io: SocketServer;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  startTruckSimulation();

  return io;
}

// Simulates truck movement every 5s for all trucks currently IN_TRANSIT.
// This satisfies E2's "simulated real-time truck location, ETA, delivery
// progress" requirement without needing a real GPS/WMS feed.
function startTruckSimulation() {
  setInterval(async () => {
    const trucks = await prisma.truck.findMany({
      where: { status: 'IN_TRANSIT' },
    });

    for (const truck of trucks) {
      const newProgress = Math.min(
        truck.progressPercent + Math.floor(Math.random() * 5),
        100
      );

      const updated = await prisma.truck.update({
        where: { id: truck.id },
        data: { progressPercent: newProgress },
      });

      io.emit('truck:update', {
        truckId: updated.id,
        truckCode: updated.truckCode,
        progressPercent: updated.progressPercent,
        currentEta: updated.currentEta,
        status: updated.status,
      });

      if (newProgress >= 100) {
        await prisma.truck.update({
          where: { id: truck.id },
          data: { status: 'ARRIVED' },
        });
        io.emit('truck:arrived', { truckId: truck.id, truckCode: truck.truckCode });
      }
    }
  }, 5000);
}
