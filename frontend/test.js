import fetch from 'node-fetch';
const getToken = async () => {
    try {
        const res = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: 'gokul@supplychain.dev', password: 'pass1234'})
        });
        const data = await res.json();
        return data.access_token;
    } catch (e) {
        console.error(e);
        return null;
    }
};

const getMe = async (token) => {
    try {
        const res = await fetch('http://localhost:8000/api/auth/me', {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        });
        const data = await res.json();
        console.log('Me:', data);
    } catch (e) {
        console.error(e);
    }
};

const run = async () => {
    console.log('Getting token...');
    const token = await getToken();
    console.log('Got token:', token);
    if (token) {
        console.log('Calling getMe...');
        await getMe(token);
    }
};
run();