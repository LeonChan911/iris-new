import { table } from 'table';
import { log } from '../utils';
import { requestConfig } from '../utils/request';

export default async function list() {
  try {
    const { templates } = await requestConfig();
    const tableHeader = ['模板名称', '模板git地址'];
    const tableBody = templates.map(t => {
      return [t.name, t.value];
    });
    const data = [tableHeader, ...tableBody];
    log.info(table(data));
  } catch (error) {}
}
