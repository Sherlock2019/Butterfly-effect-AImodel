import { test } from "node:test";
import assert from "node:assert/strict";
import { route } from "../src/lib/router";

const w = (text: string, verb?: string) => route({ text, verb }).world;

test("catalog sentences route to their starting world", () => {
  assert.equal(w("An AI agent gains unauthorized access to a bank's payment system in Paris."), "digital");
  assert.equal(w("A submarine cable outage interrupts an international network route."), "network");
  assert.equal(w("A news outlet publishes an incorrect report about a bank, and the story spreads through social media."), "media");
  assert.equal(w("The government proposes a new policy requiring large data centers to disclose their electricity and water use."), "government");
  assert.equal(w("Regional electricity prices rise sharply and raise household and business energy costs."), "society");
  assert.equal(w("A factory stops production because a supplier fails to deliver a critical component."), "business");
  assert.equal(w("A driver decides to ignore a road-closure sign."), "behaviour");
  assert.equal(w("A pedestrian hears a fire alarm and sees smoke."), "perception");
  assert.equal(w("Leo kicked the ball through the neighbour's window."), "physical");
  assert.equal(w("A lightning strike damages the transformer supplying a large AI data center."), "physical");
});

test("media needs a content act, not a platform name", () => {
  assert.equal(w("Facebook's servers go down after a database outage."), "digital");
  assert.equal(route({ text: "Facebook's servers go down after a database outage." }).rule, "digital.platform_infrastructure");
  assert.equal(w("A user posts a video about the outage on YouTube."), "media");
  assert.equal(w("I posted the letter to my aunt."), "physical"); // "post" a letter is not media
  assert.equal(w("We flew from the airport."), "physical"); // "air" inside "airport" is not media
});

test("the data-center sentence also points to Earth", () => {
  const r = route({ text: "A company deploys a large AI data center, increasing demand for electricity." });
  assert.ok(r.world === "earth" || r.also.some((a) => a.world === "earth"));
});

test("physical scale words pick a subworld", () => {
  const r = route({ text: "Electrons in the atom absorb a photon." });
  assert.equal(r.world, "physical");
  assert.ok(r.scale === "quantum" || r.scale === "atomic");
});

test("unknown verbs fall back to physical and say so", () => {
  const r = route({ text: "Zorp blicks the quux." });
  assert.equal(r.world, "physical");
  assert.equal(r.fallback, true);
  assert.match(r.why, /no routing rule/);
});
