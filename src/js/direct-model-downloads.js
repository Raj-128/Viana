// Model package references. Download permission is enforced by the approved plan on the server.
export const directModelDownloads = {
  'aerial-texture-12': 'aerial-texture-12.rar',
  'bathroom-accessories-1': 'bathroom-accessories-1.rar',
};

export const hasDirectModelDownload = (project) => project?.workType === '3d' &&
  (Object.hasOwn(directModelDownloads, project.id) || project.sourceFiles?.some(file =>
    file.url === `/api/designs/${project.id}/download` && /\.(rar|zip|max|fbx|obj|blend|c4d|stl|skp|dwg|dxf|mat|matlib|sbsar|uasset|uproject)$/i.test(file.name)) === true);
