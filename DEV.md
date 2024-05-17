### Quick start

To install dependencies we use pnpm, if you don't have pnpm you can install it with `npm i --global pnpm`.

Run `pnpm i` to prepare the repo after cloning from git.

When ready, run `pnpm start` to start the dev server.
The game will be available on http://localhost:1234

Any file changes should cause the page to reload.

The development build of the game will try to connect to your leaderboard server on port 8000 at the same origin, optionally start it with `pnpm run server` to test leaderboard functionality.

### Frontend build system information

This project uses esbuild for building the frontend during both development and the production build of the game.

Similar to vite, the frontend is built from an entrypoint HTML file at `src/index.html` - functionality provided by `esbuild-plugin-html`.

#### Production build

To build the frontend, run `pnpm run build`. The output wil be available in the `dist` folder.

If you do not wish to use the dev server (for example if testing service workers) then after building run `pnpm run sim:prod` to use the `http-server` package to serve dist directly.

#### Netlify

Since this project is a work in progress still, production builds are automatically built from the `master` branch and deployed onto Netlify at [tetromino.app](https://tetromino.app).

The Netlify build runs the same `pnpm run build` command and deploys the `dist` folder.

<a href="https://tetromino.app"><img src="https://api.netlify.com/api/v1/badges/7ba6531e-79ed-42d4-910e-f1f458a9c767/deploy-status" /></a>

#### Service workers

Service workers are only built for production builds of the game. For the service workers to be able to cache our assets, we have to list our available assets when building the service workers. We therefore do the following:

- Build our main program (from `src/index.html`)
- Build our service workers (from `src/sw/*.ts`) with reference to the built files from the main program
- Build our service worker registrar (from `esServiceRegistrar.ts`) with reference to our built service workers
- Add a script for the built JS of the service worker registrar into the output HTML file

Both the registrar and service worker programs are designed to make sure offline functionality is available, without keeping any out-of-date assets cached. Refer to their source code for more information.

### The leaderboard server

The leaderboard requires the game files as it validates games by playing them, but the game does not rely on the leaderboard (other than the types for the API). The game will function perfectly fine offline, or without the leaderboard being available.

The leaderboard server is ran directly via [B.ES.TS](https://github.com/benjamingwynn/bests) on a Raspberry Pi with [ngrok](https://ngrok.com/) for tunnelling.

I chose to use a Raspberry Pi as I'm not expecting a very high load on the server, and it's very affordable compared to cloud solutions since I already own the hardware.

However, it's worth noting that there are other solutions available. One could easily adapt this code to run on a serverless infrastructure, which would be far more scalable, or host on a service like EC2. This is why the entrypoint is `main.node.ts` - you could have a `main.serverless.ts` for a serverless entrypoint, or `main.deno.ts`/`main.bun.ts` to test with Deno or Bun.

It's also generally advisable to use a framework like Express, Koa or Hapi instead of writing code against the HTTP module directly, I've decided to take a more manual approach as a learning exercise. If you wanted to use express for example, create a `main.express.ts` file and add the routes from `api.ts`.

Under normal circumstances I would package the leaderboard server up into a Docker image, however because I'm currently using an M1 Mac for development and [pushing images to SSH remotes on macos is busted](https://github.com/docker/for-mac/issues/6869), I've gone for the simpler approach of just deploying straight to bare metal. `systemd` services are used to control the ngrok proxy and the server services.

#### Running the leaderboard server locally

To run the leaderboard server locally, run `pnpm run server` after `pnpm i`.

The leaderboard server will be hosted on port `8000`.

If you are running the game on localhost using `pnpm start` then it will automatically try to connect to your local leaderboard server.

Requests are only allowed to the leaderboard server from the allowed origins list, please check and modify the `ALLOWED_ORIGINS` from `origins.ts` appropriately for your frontend dev server.

#### No server database?

datastore.ts is currently taking the place of a real database - which just stores data as JSON on the disk under the `.data` directory. This is to keep the project small and the data easily portable, if the project gets more traction this will have to be changed to handle the amount of data. Either SQL or NoSQL would fit this project well.

### Contributing

Contributions are welcome, especially bug fixes!

This project uses Prettier to automatically format files, please make sure you use Prettier against your code before submitting a pull request.