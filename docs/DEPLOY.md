# Putting PupBox on a server

You need one Linux server (Ubuntu 24.04, 2 CPU / 4 GB RAM is plenty to start)
with Docker installed, and your domain's DNS pointing at it:
`pupbox.ge`, `admin.pupbox.ge` and `api.pupbox.ge`.

## 0. A free server (Oracle Cloud "Always Free")

1. Sign up at cloud.oracle.com (a card is asked only to verify you; Always
   Free resources are never charged). Pick a home region close to Georgia,
   e.g. Frankfurt.
2. Create instance → image **Ubuntu 24.04**, shape **Ampere VM.Standard.A1.Flex**
   with 2 OCPU / 12 GB (free). Add your SSH key. Note the **public IP**.
3. In the instance's subnet → Security List, add ingress rules for TCP **80**
   and **443** from 0.0.0.0/0. On the server also open them:
   `sudo iptables -I INPUT 6 -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save`
4. Install Docker: `curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER` (log out and in).

### DNS at domenebi.ge

In the pupbox.ge DNS settings add four **A** records, all to the server's
public IP: `@`, `www`, `admin`, `api`. Wait until `ping api.pupbox.ge`
shows that IP (minutes to a few hours).

## 1. Get the code onto the server

```bash
git clone https://github.com/kurdovanidzetamuna-netizen/pupbox.git
cd pupbox
```

## 2. Create the settings file (once)

```bash
bash scripts/setup-production-env.sh
```

It asks for your domain and admin email, generates every password and secret
itself, and writes `.env` (readable only by you). **It shows the admin password
once — save it in your password manager.** Nothing secret is ever typed by you
or stored in git.

Payment (Flitt) and email (Resend) keys stay empty until you have them. Add
them later by editing `.env` on the server (`nano .env`), then restart (step 4).

## 3. First start

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
docker compose -f docker-compose.prod.yml exec api sh -c 'cd packages/database && for s in seed seed-plans seed-delivery seed-products seed-catalog-ka seed-legal cleanup-catalogue; do npx ts-node prisma/$s.ts || exit 1; done'
```

That creates the admin account, plans, delivery options, starter products
(with Georgian text), the Terms and Privacy pages, and tidies test data.

> Not yet tried on a real server — expect to fix small things on the first run.

## 4. After changing `.env` or pulling new code

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Still needed before real customers

- HTTPS is built in: the `caddy` service gets certificates for pupbox.ge,
  www, admin and api by itself once DNS points at the server. The apps listen
  only on 127.0.0.1, so everything goes through Caddy.
- Daily database backups.
- The pre-launch items in the QA workbook (fake reviews, legal placeholders).

If the admin password is lost:
`docker compose -f docker-compose.prod.yml exec api sh -c 'cd packages/database && npx ts-node prisma/set-admin-password.ts'`
