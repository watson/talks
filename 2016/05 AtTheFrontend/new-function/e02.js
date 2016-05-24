var admin = false

var fn = new Function('var admin = true')
fn()

if (admin) console.log('user is admin')
else console.log('user is NOT admin')
