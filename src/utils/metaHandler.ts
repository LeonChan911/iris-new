import { supportMetaDefaultValue } from '../enums/meta';

export function genMetaDefault(projectName: string) {
  const newMap = Object.assign({}, { [supportMetaDefaultValue.projectName]: projectName });
  return newMap;
}
