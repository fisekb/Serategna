document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#worker-profile-form');
  const loading = document.querySelector('#profile-loading');
  const message = document.querySelector('#form-message');
  const pageMessage = document.querySelector('#page-message');
  const deleteButton = document.querySelector('#delete-profile');
  const saveButton = document.querySelector('#save-profile');
  const skillSelect = document.querySelector('#skillId');
  let hasProfile = false;

  const user = await ui.requireRole('worker');
  if (!user) return;

  async function loadForm() {
    try {
      const [skillsResult, profileResult] = await Promise.all([
        api.get('/skills'),
        api.get('/workers/profile').catch((error) => {
          if (error.status === 404) return null;
          throw error;
        })
      ]);
      skillsResult.data.skills.forEach((skill) => {
        const option = document.createElement('option');
        option.value = skill.id;
        option.textContent = skill.name;
        skillSelect.append(option);
      });

      if (profileResult) {
        hasProfile = true;
        const profile = profileResult.data.profile;
        ['skillId', 'hourlyRate', 'city', 'area', 'experienceYears', 'bio'].forEach((field) => {
          const control = form.elements.namedItem(field);
          if (profile[field] !== null && profile[field] !== undefined) control.value = profile[field];
        });
        saveButton.textContent = 'Update profile';
        deleteButton.hidden = false;
        ui.showMessage(pageMessage, profile.isApproved
          ? 'Your profile is approved and visible to customers.'
          : 'Your profile is awaiting administrator approval.', 'info');
      } else {
        ui.showMessage(pageMessage, 'Create your worker profile to be considered for approval.', 'info');
      }

      loading.hidden = true;
      form.hidden = false;
    } catch (error) {
      loading.hidden = true;
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      skillId: Number(values.get('skillId')),
      hourlyRate: Number(values.get('hourlyRate')),
      city: String(values.get('city')).trim(),
      area: String(values.get('area') || '').trim() || null,
      experienceYears: Number(values.get('experienceYears')),
      bio: String(values.get('bio') || '').trim() || null
    };
    ui.showMessage(message, '', 'info');
    ui.setLoading(saveButton, true, hasProfile ? 'Updating profile…' : 'Creating profile…');
    try {
      if (hasProfile) {
        await api.put('/workers/profile', payload);
        ui.showMessage(message, 'Your profile has been updated.', 'success');
      } else {
        await api.post('/workers/profile', payload);
        hasProfile = true;
        deleteButton.hidden = false;
        ui.showMessage(message, 'Your profile was created and submitted for approval.', 'success');
      }
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
    } finally {
      ui.setLoading(saveButton, false);
      saveButton.textContent = hasProfile ? 'Update profile' : 'Save profile';
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!window.confirm('Delete your worker profile? This cannot be undone.')) return;
    ui.setLoading(deleteButton, true, 'Deleting…');
    try {
      await api.delete('/workers/profile');
      hasProfile = false;
      form.reset();
      document.querySelector('#experienceYears').value = '0';
      deleteButton.hidden = true;
      saveButton.textContent = 'Save profile';
      ui.showMessage(message, 'Your worker profile has been deleted.', 'success');
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
    } finally {
      ui.setLoading(deleteButton, false);
      deleteButton.hidden = !hasProfile;
    }
  });

  await loadForm();
});
