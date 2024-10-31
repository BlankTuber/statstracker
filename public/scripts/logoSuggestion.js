document.addEventListener('DOMContentLoaded', function() {
    const suggestLogoButton = document.getElementById('suggestLogo');

    suggestLogoButton.addEventListener('click', async function() {
        const teamName = document.getElementById('teamName').value;
        if (!teamName) {
            alert('Please enter a team name first.');
            return;
        }

        try {
            const response = await fetch(`/api/search-logos?query=${encodeURIComponent(teamName)}`);
            const data = await response.json();
            const suggestedLogos = document.getElementById('suggestedLogos');
            suggestedLogos.innerHTML = '';
            data.forEach(imageUrl => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = 'Suggested logo';
                img.addEventListener('click', function() {
                    updateLogoPreview(this.src);
                    document.getElementById('logoUrl').value = this.src;
                    clearFileInput(); // Clear file input when a suggested logo is selected
                });
                suggestedLogos.appendChild(img);
            });
            document.getElementById('logoSuggestions').style.display = 'block';
        } catch (error) {
            console.error('Error fetching logo suggestions:', error);
            alert('Failed to fetch logo suggestions. Please try again.');
        }
    });

    function updateLogoPreview(src) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = src;
        previewImage.style.display = 'block';
    }

    function clearFileInput() {
        document.getElementById('logoFile').value = ''; // Clear the file input
    }
});