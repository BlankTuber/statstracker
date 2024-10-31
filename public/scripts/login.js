document.getElementById('getCodeBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const errorElement = document.getElementById('error');
    try {
        const response = await fetch('/login/getCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            errorElement.textContent = data.message;
            errorElement.style.color = 'green';
        } else {
            errorElement.textContent = data.error;
            errorElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error:', error);
        errorElement.textContent = 'Failed to send verification code';
        errorElement.style.color = 'red';
    }
});

document.getElementById('submitBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const code = document.getElementById('codeInput').value;
    const errorElement = document.getElementById('error');
    try {
        const response = await fetch('/login/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await response.json();
        if (response.ok) {
            errorElement.textContent = 'Login successful';
            errorElement.style.color = 'green';
            window.location.href = '/'; // Redirect to home page
        } else {
            errorElement.textContent = data.error;
            errorElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error:', error);
        errorElement.textContent = 'Login failed';
        errorElement.style.color = 'red';
    }
});