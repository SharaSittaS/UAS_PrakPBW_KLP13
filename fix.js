const fs = require('fs');
const files = [
  'views/admin/categories/index.ejs',
  'views/admin/guides/index.ejs',
  'views/admin/contacts/index.ejs'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(
    '<% }) %>\n              <% else { %>',
    '<% } else { %>'
  );
  fs.writeFileSync(f, content);
  console.log('Fixed:', f);
});