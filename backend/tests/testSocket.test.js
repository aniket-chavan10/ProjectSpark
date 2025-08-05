describe("Socket.IO cricket flow - isolated", () => {
  let ioServer, httpServer, clientSocket, mockState;

  beforeAll((done) => {
    mockState = {};
    httpServer = http.createServer();
    ioServer = new Server(httpServer);

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = ioClient(`http://localhost:${port}`);

      ioServer.on("connection", socket => {
        socket.on("setToss", ({ matchId, tossWinnerId, tossDecision }, ack) => {
          mockState.toss = { matchId, tossWinnerId, tossDecision };
          ack({ success: true });
          socket.emit("toss_updated", mockState.toss);
        });
        // Add similar handlers for "setInitialPlayers", "registerBallEvent", etc.
      });

      clientSocket.on("connect", done);
    });
  });

  afterAll((done) => {
    ioServer.close();
    clientSocket.close();
    httpServer.close(done);
  });

  test("should process toss and emit update", (done) => {
    clientSocket.once("toss_updated", (data) => {
      expect(data.matchId).toBe(1);
      expect(data.tossWinnerId).toBe(5);
      expect(data.tossDecision).toBe("bat");
      done();
    });
    clientSocket.emit("setToss", { matchId: 1, tossWinnerId: 5, tossDecision: "bat" }, (res) => {
      expect(res.success).toBe(true);
    });
  });

  // Add tests for every real event in your app!

});
