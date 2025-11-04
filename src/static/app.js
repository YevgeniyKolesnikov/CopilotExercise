document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  // Add a timestamp query to bypass any aggressive caching layers and request fresh data
  const response = await fetch(`/activities?ts=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      // Reset the activity select so repeated calls don't duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section: show 'None yet' when empty. Each participant has a small remove button.
        let participantsHTML = "";
        if (details.participants && details.participants.length) {
          const items = details.participants
            .map(
              (p) =>
                `<li class="participant-item"><span class="participant-email">${p}</span><button class="participant-remove" data-activity="${encodeURIComponent(
                  name
                )}" data-email="${encodeURIComponent(p)}" aria-label="Remove ${p}">&times;</button></li>`
            )
            .join("");
          participantsHTML = `
            <p><strong>Participants:</strong></p>
            <ul class="participants-list">
              ${items}
            </ul>
          `;
        } else {
          participantsHTML = `<p><strong>Participants:</strong> <span class="muted">None yet</span></p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Wire up remove handlers for participants in this card
        activityCard.querySelectorAll('.participant-remove').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const activityEncoded = btn.dataset.activity;
            const emailEncoded = btn.dataset.email;
            // decode to display in messages if needed
            const activity = decodeURIComponent(activityEncoded);
            const email = decodeURIComponent(emailEncoded);

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
                method: 'POST',
                headers: { 'Cache-Control': 'no-store' }
              });
              const resJson = await resp.json();

                  if (resp.ok) {
                    messageDiv.textContent = resJson.message;
                    messageDiv.className = 'success';
                    messageDiv.classList.remove('hidden');
                    // refresh activities to reflect change
                    await fetchActivities();
                  } else {
                messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }

              setTimeout(() => {
                messageDiv.classList.add('hidden');
              }, 5000);
            } catch (err) {
              console.error('Error unregistering participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => {
                messageDiv.classList.add('hidden');
              }, 5000);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Optimistically add a participant to the DOM for the given activity name.
  // This is a fallback so the UI updates immediately even if a fetch returns stale data.
  function addParticipantToCard(activityName, email) {
    // Find the activity card by its title text
    const cards = Array.from(document.querySelectorAll('.activity-card'));
    const card = cards.find(c => {
      const h4 = c.querySelector('h4');
      return h4 && h4.textContent.trim() === activityName;
    });

    if (!card) return;

    // Find participants list or create it
    let list = card.querySelector('.participants-list');
    if (!list) {
      // create the participants section
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<p><strong>Participants:</strong></p><ul class="participants-list"></ul>`;
      card.appendChild(wrapper);
      list = card.querySelector('.participants-list');
    }

    // Create participant item
    const li = document.createElement('li');
    li.className = 'participant-item';
    li.innerHTML = `<span class="participant-email">${email}</span><button class="participant-remove" data-activity="${encodeURIComponent(activityName)}" data-email="${encodeURIComponent(email)}" aria-label="Remove ${email}">&times;</button>`;
    list.appendChild(li);

    // Attach remove handler to the new button
    const btn = li.querySelector('.participant-remove');
    btn.addEventListener('click', async () => {
      const activity = decodeURIComponent(btn.dataset.activity);
      const email = decodeURIComponent(btn.dataset.email);
      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
          method: 'POST',
          headers: { 'Cache-Control': 'no-store' }
        });
        const resJson = await resp.json();
        if (resp.ok) {
          messageDiv.textContent = resJson.message;
          messageDiv.className = 'success';
          messageDiv.classList.remove('hidden');
          await fetchActivities();
        } else {
          messageDiv.textContent = resJson.detail || 'Failed to remove participant';
          messageDiv.className = 'error';
          messageDiv.classList.remove('hidden');
        }
        setTimeout(() => messageDiv.classList.add('hidden'), 5000);
      } catch (err) {
        console.error('Error unregistering participant:', err);
      }
    });

    // Update availability display if present
    const availP = card.querySelector('p strong') && Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability'));
    if (availP) {
      // extract number and decrement
      const match = availP.textContent.match(/(\d+) spots left/);
      if (match) {
        const current = parseInt(match[1], 10);
        const newText = availP.innerHTML.replace(/\d+ spots left/, Math.max(0, current - 1) + ' spots left');
        availP.innerHTML = newText;
      }
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { 'Cache-Control': 'no-store' }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Optimistically add participant to the UI so it appears immediately
        try {
          addParticipantToCard(activity, email);
        } catch (e) {
          console.error('Optimistic UI update failed:', e);
        }
        // Refresh activities so the new participant appears (authoritative source)
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
