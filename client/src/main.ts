import "./style.css";
import { App } from "./app";
import { CohortSocket } from "./net";

function main(): void {
  const container = document.getElementById("app");
  if (container === null) throw new Error("Missing #app container");

  const socket = new CohortSocket();
  new App(container, socket);
}

main();
