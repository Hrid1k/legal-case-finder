import bcrypt from 'bcryptjs';
import { pool } from '../lib/db.js';
import { embed } from '../lib/embed.js';

// All cases below are FICTIONAL sample data for demonstration.
const users = [
  ['Admin User', 'admin@legal.test', 'Admin@123', 'admin'],
  ['Asha Rao', 'lawyer1@legal.test', 'Lawyer@123', 'lawyer'],
  ['Vikram Nair', 'lawyer2@legal.test', 'Lawyer@123', 'lawyer'],
];
const courts = [
  ['Supreme Court of India', 'supreme', 'New Delhi'],
  ['Karnataka High Court', 'high', 'Bengaluru'],
  ['Delhi High Court', 'high', 'New Delhi'],
  ['Bengaluru City Civil Court', 'district', 'Bengaluru'],
];
const judges = [['J. Menon', 1], ['J. Iyer', 1], ['J. Kulkarni', 2], ['J. Sharma', 3], ['J. Pillai', 4]];
// [case_number, title, court_idx, judge_idx, category, status, date, summary]
const cases = [
  ['SC/2019/101', 'Reddy v. Greenfield Developers', 1, 1, 'property', 'decided', '2019-03-12', 'Buyer sued a builder for failing to hand over an apartment on the promised date. The court held that unreasonable delay in possession entitles the buyer to refund with interest and compensation for mental agony.'],
  ['SC/2020/204', 'Kapoor v. DataSphere Ltd', 1, 2, 'privacy', 'decided', '2020-08-21', 'A customer\'s personal data was leaked in a security breach at an online platform. The court recognised informational privacy as part of the right to life and ordered the company to pay damages and strengthen data protection safeguards.'],
  ['KHC/2021/311', 'Shetty v. Nimbus Software', 2, 3, 'employment', 'decided', '2021-02-02', 'An engineer was dismissed without notice or inquiry after raising a workplace safety complaint. The High Court found the termination to be retaliatory and wrongful, and ordered reinstatement with back wages.'],
  ['DHC/2021/412', 'Aurora Foods v. Aurum Snacks', 3, 4, 'ip', 'decided', '2021-11-18', 'Dispute over a deceptively similar trademark and packaging used for packaged snacks. The court granted an injunction because consumers were likely to be confused about the origin of the goods.'],
  ['KHC/2022/518', 'Gowda v. SwiftCab Pvt Ltd', 2, 3, 'consumer', 'decided', '2022-05-09', 'A passenger was injured due to a defective ride-hailing vehicle and the company denied responsibility. The court held the platform liable for deficiency in service and ordered compensation.'],
  ['SC/2022/602', 'Citizens Forum v. Riverside Tannery', 1, 1, 'environment', 'decided', '2022-09-30', 'Residents challenged industrial effluent discharged into a river that polluted drinking water. The court applied the polluter-pays principle, ordered shutdown until treatment plant installation and directed cleanup costs.'],
  ['DHC/2022/703', 'Mehta Traders v. Orion Logistics', 3, 4, 'contract', 'decided', '2022-12-14', 'A supplier claimed damages after a logistics company breached a delivery contract during a shortage. The court held that the force majeure clause did not excuse a failure that was foreseeable and awarded damages for losses.'],
  ['BCC/2023/815', 'Fernandes v. Fernandes', 4, 5, 'family', 'decided', '2023-04-25', 'Parents disputed custody of a young child after separation. The court prioritised the welfare of the child, granted primary custody to the mother and fixed regular visitation for the father.'],
  ['KHC/2023/920', 'State v. Rathod', 2, 3, 'criminal', 'appealed', '2023-07-07', 'Accused charged with online banking fraud using phishing emails to steal customer credentials. The court examined the admissibility of electronic evidence and convicted the accused, who has appealed.'],
  ['SC/2023/1031', 'Banerjee v. City Hospital', 1, 2, 'medical', 'decided', '2023-10-19', 'Patient suffered permanent injury after a surgical procedure was performed without informed consent and with negligent post-operative care. The court awarded compensation and laid down standards for informed consent.'],
  ['DHC/2024/1109', 'Nair Enterprises v. Revenue Dept', 3, 4, 'tax', 'decided', '2024-01-30', 'A business challenged the denial of input tax credit by the tax authority for lack of supplier compliance. The court held that a bona fide purchaser cannot be penalised for the supplier\'s default.'],
  ['KHC/2024/1207', 'Iqbal v. Metro Landlord Assn', 2, 3, 'property', 'pending', null, 'Tenant challenges a sudden eviction notice and rent increase imposed without proper notice. Matter concerns the protection of tenants against arbitrary eviction under the rent control law.'],
];
// citing -> cited (case_number)
const cites = [
  ['SC/2020/204', 'SC/2019/101'], ['KHC/2021/311', 'SC/2020/204'], ['KHC/2022/518', 'SC/2020/204'],
  ['SC/2022/602', 'SC/2019/101'], ['SC/2023/1031', 'KHC/2022/518'], ['SC/2023/1031', 'SC/2020/204'],
  ['KHC/2023/920', 'SC/2020/204'], ['DHC/2022/703', 'DHC/2021/412'], ['DHC/2024/1109', 'DHC/2022/703'],
  ['KHC/2024/1207', 'SC/2019/101'], ['KHC/2022/518', 'SC/2019/101'],
];

const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query('TRUNCATE audit_log, assignments, case_citations, case_embeddings, cases, judges, courts, users RESTART IDENTITY CASCADE');
  for (const [n, e, p, r] of users)
    await c.query('INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4)', [n, e, await bcrypt.hash(p, 10), r]);
  for (const x of courts) await c.query('INSERT INTO courts(name,level,city) VALUES ($1,$2,$3)', x);
  for (const x of judges) await c.query('INSERT INTO judges(name,court_id) VALUES ($1,$2)', x);
  for (const k of cases) {
    const r = await c.query(
      `INSERT INTO cases(case_number,title,court_id,judge_id,category,status,decided_on,summary,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1) RETURNING id`, k);
    console.log('Embedding', k[0]);
    await c.query('INSERT INTO case_embeddings(case_id, embedding) VALUES ($1,$2::vector)', [r.rows[0].id, await embed(`${k[1]}. ${k[7]}`)]);
  }
  for (const [a, b] of cites)
    await c.query(`INSERT INTO case_citations SELECT x.id, y.id FROM cases x, cases y WHERE x.case_number=$1 AND y.case_number=$2`, [a, b]);
  await c.query(`CALL assign_case(1, 2)`); await c.query(`CALL assign_case(3, 2)`); await c.query(`CALL assign_case(6, 3)`);
  await c.query('COMMIT');
  console.log('\nSeeded.\n admin   : admin@legal.test   / Admin@123\n lawyer  : lawyer1@legal.test / Lawyer@123');
} catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); await pool.end(); }
