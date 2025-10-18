const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("YOUR_GOOGLE_CLIENT_ID");

app.post('/auth/google', async (req, res) => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: "YOUR_GOOGLE_CLIENT_ID",
    });
    const payload = ticket.getPayload();
    // payload contains email, name, picture
    console.log(payload);
    // Save user in DB (sign up) or login if exists
    res.json({ user: payload });
});
