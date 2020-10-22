global.admin = false

var fn = new Function('admin = true')
fn()

if (global.admin) console.log('user is admin')
else console.log('user is NOT admin')
