document.addEventListener('DOMContentLoaded', function() {
    const logoUrlInput = document.getElementById('logoUrl');
    const logoFileInput = document.getElementById('logoFile');
    const createTeamButton = document.getElementById('createTeam');

    logoUrlInput.addEventListener('input', function(event) {
        updateLogoPreview(event.target.value);
        clearFileInput();
    });

    logoFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                updateLogoPreview(e.target.result);
                logoUrlInput.value = ''; // Clear URL input when file is selected
            }
            reader.readAsDataURL(file);
        }
    });

    function updateLogoPreview(src) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = src;
        previewImage.style.display = 'block';
    }

    function clearFileInput() {
        logoFileInput.value = ''; // Clear the file input
    }

    createTeamButton.addEventListener('click', async function() {
        const teamName = document.getElementById('teamName').value;
        const logoUrl = logoUrlInput.value;
        const logoFile = logoFileInput.files[0];

        if (!teamName) {
            alert('Please enter a team name.');
            return;
        }

        const confirmed = confirm(`Are you sure you want to create a team named "${teamName}" with the selected logo?`);
        if (!confirmed) {
            return;
        }

        try {
            let finalLogoUrl;

            // Handle logo upload or use URL if provided
            if (logoFile) {
                const formData = new FormData();
                formData.append('file', logoFile);
                const logoUploadResponse = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!logoUploadResponse.ok) {
                    throw new Error('Failed to upload logo');
                }

                const logoData = await logoUploadResponse.json();
                finalLogoUrl = logoData.url; // Use uploaded logo URL
            } else if (logoUrl) {
                finalLogoUrl = logoUrl; // Use provided URL directly
            } else {
                finalLogoUrl = null; // No logo provided
            }

            // Create the team with or without a logo
            const teamResponse = await fetch('/newTeam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: teamName, logo: finalLogoUrl })
            });

            if (teamResponse.ok) {
                alert('Team created successfully!');
                window.location.reload();
            } else {
                const error = await teamResponse.json();
                alert('Error: ' + error.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while creating the team.');
        }
    });
});