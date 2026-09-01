const state = {
  user: null,
  profile: null,
  profiles: [],
  contributions: [],
  proposals: [],
  votes: []
};

const $ = selector => document.querySelector(selector);

const money = value =>
  `KSh ${Number(value || 0).toLocaleString('en-KE', {
    maximumFractionDigits: 0
  })}`;

const safe = value =>
  String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);

const localDateISO = date => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const currentMonth = () => localDateISO(new Date()).slice(0, 7);

const dateLabel = value => {
  if (!value) return 'Unknown date';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

function getDisplayName(profile = state.profile, user = state.user) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Member'
  );
}

function getInitials(name) {
  return String(name || 'Member')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'M';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function updateHeader() {
  const greeting = $('#welcomeGreeting');
  const date = document.querySelector('header .eyebrow');
  const avatar = $('.avatar');
  const sideAvatar = $('.avatar.mini');
  const sideName = $('#side-name');
  const sideRole = $('#side-role');
  const name = getDisplayName();
  const role = state.profile?.role || 'member';

  if (greeting) greeting.textContent = `${getGreeting()}, ${name}`;
  if (date) date.textContent = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (avatar) avatar.textContent = getInitials(name);
  if (sideAvatar) sideAvatar.textContent = getInitials(name);
  if (sideName) sideName.textContent = name;
  if (sideRole) sideRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
}

function isOfficer() {
  return ['owner', 'treasurer'].includes(state.profile?.role);
}

function isOwner() {
  return state.profile?.role === 'owner';
}

function showError(message, element = '#login-error') {
  const target = $(element);
  if (target) target.textContent = message || '';
  console.error(message);
}

function setBusy(button, busy, busyText = 'Saving…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
  }
}

function renderMonthRow() {
  const container = $('#month-row');
  if (!container) return;
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      label: date.toLocaleDateString('en-KE', { month: 'short' }),
      current: offset === 0
    });
  }
  container.innerHTML = months.map(month => `<span class="${month.current ? 'current' : ''}">${safe(month.label)}</span>`).join('');
}

function renderNextContribution() {
  const dateElement = $('#next-contribution-date');
  const detailElement = $('#next-contribution-detail');
  if (!dateElement || !detailElement) return;
  const today = new Date();
  const next = new Date(today.getFullYear(), today.getMonth(), 5);
  if (today.getDate() >= 5) next.setMonth(next.getMonth() + 1);
  dateElement.textContent = next.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
  detailElement.textContent = 'KSh 5,000 due';
}

function render() {
  if (!state.user) return;

  updateHeader();
  renderMonthRow();
  renderNextContribution();
  renderContributionChart();

  const month = currentMonth();
  const total = state.contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const thisMonth = state.contributions
    .filter(item => String(item.paid_on || '').startsWith(month))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const mine = state.contributions
    .filter(item => item.member_id === state.user.id)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownPercent = total ? (mine / total) * 100 : 0;

  if ($('#group-capital')) $('#group-capital').textContent = money(total);
  if ($('#group-capital-stat')) $('#group-capital-stat').textContent = money(total);
  if ($('#capital-change')) $('#capital-change').textContent = `${thisMonth ? '+' + money(thisMonth) : 'KSh 0'} this month`;
  if ($('#active-project-count')) $('#active-project-count').textContent = state.proposals.filter(item => ['approved','active'].includes(item.status)).length;
  if ($('#project-status')) $('#project-status').textContent = state.proposals.length ? `${state.proposals.length} proposal${state.proposals.length === 1 ? '' : 's'} total` : 'No active projects';
  if ($('#month-total')) $('#month-total').textContent = thisMonth ? `+ ${money(thisMonth)} this month` : 'No contributions recorded this month';
  if ($('#your-ownership')) $('#your-ownership').textContent = `${ownPercent.toFixed(1)}%`;
  if ($('#your-units')) $('#your-units').textContent = `${money(mine)} contributed`;
  if ($('#member-count')) $('#member-count').textContent = state.profiles.length;
  if ($('#member-status')) $('#member-status').textContent = `${state.profiles.length} registered member${state.profiles.length === 1 ? '' : 's'}`;
  if ($('#contribution-total')) $('#contribution-total').textContent = money(thisMonth);
  if ($('#contribution-caption')) $('#contribution-caption').textContent = `Contributed in ${new Date().toLocaleDateString('en-KE', { month: 'long' })}`;

  const target = Math.max(state.profiles.length * 5000, 1);
  if ($('#progress-fill')) $('#progress-fill').style.width = `${Math.min((thisMonth / target) * 100, 100)}%`;

  const personal = state.contributions.find(item =>
    item.member_id === state.user.id && String(item.paid_on || '').startsWith(month)
  );
  if ($('#payment-title')) $('#payment-title').textContent = personal ? 'Your contribution is recorded' : 'Your contribution is not recorded this month';
  if ($('#payment-detail')) $('#payment-detail').textContent = personal
    ? `${money(personal.amount)} paid on ${dateLabel(personal.paid_on)}`
    : 'Contact a D24 officer once you have paid.';

  renderMembers(total);
  renderMemberSelect();
  renderProposal();
  renderAdmin();
  renderActivity();
  renderNotifications();

  const contributionButton = $('[data-open="contribution-dialog"]');
  if (contributionButton) contributionButton.style.display = isOfficer() ? '' : 'none';
}

function renderContributionChart() {
  const container = $('#contribution-chart');
  if (!container) return;
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = localDateISO(date).slice(0, 7);
    const total = state.contributions.filter(item => String(item.paid_on || '').startsWith(key)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    months.push({ label: date.toLocaleDateString('en-KE', { month: 'short' }), total });
  }
  const max = Math.max(...months.map(m => m.total), 1);
  container.innerHTML = months.map(month => {
    const height = Math.max(8, (month.total / max) * 100);
    return `<div class="chart-bar-wrap" title="${safe(month.label)}: ${safe(money(month.total))}"><div class="chart-value">${month.total ? money(month.total).replace('KSh ','') : ''}</div><i class="chart-bar" style="height:${height}%"></i><span>${safe(month.label)}</span></div>`;
  }).join('');
}

function renderMembers(total) {
  const container = $('#member-list');
  if (!container) return;

  container.innerHTML = state.profiles.length
    ? state.profiles.slice(0, 4).map((profile, index) => {
      const amount = state.contributions
        .filter(item => item.member_id === profile.id)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const percent = total ? (amount / total) * 100 : 0;
      const name = profile.display_name || profile.username || 'Member';
      const avatarClasses = ['cream', 'green', 'gold', 'rose'];
      return `<div class="member">
        <span class="member-avatar ${avatarClasses[index % avatarClasses.length]}">${safe(getInitials(name))}</span>
        <div><b>${safe(name)}${profile.id === state.user.id ? ' (you)' : ''}</b><small>${money(amount)} contributed</small></div>
        <strong>${percent.toFixed(1)}%</strong>
      </div>`;
    }).join('')
    : '<p class="empty">No members found.</p>';
}

function renderMemberSelect() {
  const select = $('#member-name');
  if (!select) return;
  select.innerHTML = state.profiles.map(profile => {
    const name = profile.display_name || profile.username || 'Member';
    return `<option value="${safe(profile.id)}">${safe(name)}</option>`;
  }).join('');
}

function renderProposal() {
  const proposal = state.proposals.find(item => item.status === 'review') || state.proposals[0];
  const proposalVotes = proposal ? state.votes.filter(vote => vote.proposal_id === proposal.id) : [];
  const yesVotes = proposalVotes.filter(vote => vote.vote === true).length;
  const requiredVotes = Math.max(1, Math.ceil(state.profiles.length * 0.75));
  const myVote = proposalVotes.find(vote => vote.voter_id === state.user.id);

  if ($('#proposal-count')) $('#proposal-count').textContent = `${state.proposals.filter(item => item.status === 'review').length} review${state.proposals.filter(item => item.status === 'review').length === 1 ? '' : 's'}`;
  if ($('#latest-project')) $('#latest-project').textContent = proposal?.title || 'No projects submitted';
  if ($('#latest-description')) $('#latest-description').textContent = proposal?.description || 'Members can submit an investment proposal for group review.';
  if ($('#project-target')) $('#project-target').textContent = proposal ? `Request: ${money(proposal.requested_amount)}` : 'Awaiting proposal';

  const summary = $('#vote-summary');
  if (summary) {
    summary.style.display = proposal ? '' : 'none';
    summary.textContent = proposal ? `${yesVotes} yes vote${yesVotes === 1 ? '' : 's'} of ${requiredVotes} needed · Status: ${proposal.status}` : '';
  }

  const voteButtonsVisible = proposal?.status === 'review';
  const yes = $('#vote-yes');
  const no = $('#vote-no');
  if (yes) {
    yes.style.display = voteButtonsVisible ? '' : 'none';
    yes.textContent = myVote?.vote === true ? 'You voted yes' : 'Vote yes';
  }
  if (no) {
    no.style.display = voteButtonsVisible ? '' : 'none';
    no.textContent = myVote?.vote === false ? 'You voted no' : 'Vote no';
  }

  const approvalPercent = state.profiles.length ? Math.min((yesVotes / state.profiles.length) * 100, 100) : 0;
  if ($('#project-progress-label')) $('#project-progress-label').textContent = proposal ? `${approvalPercent.toFixed(0)}% approval` : '0% approval';
  if ($('#project-progress-fill')) $('#project-progress-fill').style.width = `${approvalPercent}%`;

  const approve = $('#approve-project');
  if (approve) approve.style.display = proposal?.status === 'review' && isOfficer() && yesVotes >= requiredVotes ? '' : 'none';

  const deleteButton = $('#delete-project');
  if (deleteButton) deleteButton.style.display = proposal && isOwner() ? '' : 'none';
}

function renderAdmin() {
  const nav = $('#admin-nav');
  const panel = $('#admin');
  const owner = isOwner();
  if (nav) nav.style.display = owner ? '' : 'none';
  if (panel) panel.classList.toggle('visible', owner);
  if (!owner || !$('#admin-members')) return;

  $('#admin-members').innerHTML = state.profiles.map(profile => {
    const name = profile.display_name || profile.username || 'Member';
    return `<tr>
      <td><b>${safe(name)}</b>${profile.id === state.user.id ? ' <small>(you)</small>' : ''}</td>
      <td>${safe(profile.role || 'member')}</td>
      <td><select class="role-select" data-member-id="${safe(profile.id)}" aria-label="Change ${safe(name)} role">
        <option value="member" ${profile.role === 'member' ? 'selected' : ''}>Member</option>
        <option value="treasurer" ${profile.role === 'treasurer' ? 'selected' : ''}>Treasurer</option>
        <option value="owner" ${profile.role === 'owner' ? 'selected' : ''}>Owner</option>
      </select></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.role-select').forEach(select => select.addEventListener('change', changeRole));
}

function renderActivity() {
  const activity = [
    ...state.contributions.map(item => ({ type: 'contribution', created_at: item.created_at, item })),
    ...state.proposals.map(item => ({ type: 'proposal', created_at: item.created_at, item }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

  const container = $('#activity-list');
  if (!container) return;
  container.innerHTML = activity.length ? activity.map(({ type, item }) => {
    if (type === 'contribution') {
      const member = state.profiles.find(profile => profile.id === item.member_id);
      return `<div class="activity-item"><span class="activity-symbol">✓</span><span><b>${safe(member?.display_name || member?.username || 'Member')} contributed</b><small>${dateLabel(item.paid_on)}</small></span><strong>${money(item.amount)}</strong></div>`;
    }
    return `<div class="activity-item"><span class="activity-symbol">↗</span><span class="activity-main"><b>${safe(item.title)}</b><small>Project proposal · ${safe(item.status)}</small></span><strong>Request: ${money(item.requested_amount)}</strong>${isOwner() ? `<button class="danger-button compact" data-delete-project="${safe(item.id)}" title="Delete this project">Delete</button>` : ''}</div>`;
  }).join('') : '<p class="empty">No shared records yet. Add the first contribution or proposal.</p>';
}

function renderNotifications() {
  const container = $('#notification-list');
  if (!container) return;
  const items = [];
  const reviewCount = state.proposals.filter(item => item.status === 'review').length;
  const currentMonthPaid = state.contributions.some(item => item.member_id === state.user?.id && String(item.paid_on || '').startsWith(currentMonth()));
  if (reviewCount) items.push({ icon: '◉', title: `${reviewCount} proposal${reviewCount === 1 ? '' : 's'} awaiting review`, detail: 'Your group has an investment decision to make.' });
  if (currentMonthPaid) items.push({ icon: '✓', title: 'Your contribution is recorded', detail: 'Your latest D24 payment is in the ledger.' });
  else items.push({ icon: '◷', title: 'Contribution reminder', detail: 'Your current month contribution has not been recorded.' });
  if (state.proposals.some(item => item.status === 'approved')) items.push({ icon: '↗', title: 'Approved investment', detail: 'At least one proposal has reached approval.' });
  container.innerHTML = items.map(item => `<div class="notification-item"><span>${item.icon}</span><div><b>${safe(item.title)}</b><small>${safe(item.detail)}</small></div></div>`).join('');
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

async function loadData() {
  if (!state.user) return;

  try {
    const results = await Promise.all([
      d24Supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle(),
      d24Supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      d24Supabase.from('contributions').select('*').order('created_at', { ascending: false }),
      d24Supabase.from('project_proposals').select('*').order('created_at', { ascending: false }),
      d24Supabase.from('proposal_votes').select('*')
    ]);

    const failure = results.find(result => result.error);
    if (failure) {
      const message = failure.error?.message || 'Could not load D24 records.';
      setAuthScreenVisible(false);
      showError(`Could not load D24 records: ${message}`);
      return;
    }

    const [profileResult, membersResult, contributionResult, proposalResult, voteResult] = results;
    state.profile = profileResult.data;
    state.profiles = membersResult.data || [];
    state.contributions = contributionResult.data || [];
    state.proposals = proposalResult.data || [];
    state.votes = voteResult.data || [];

    if (!state.profile) {
      setAuthScreenVisible(false);
      showError('Your account exists, but no D24 profile was found. Run supabase-complete.sql and then sign in again.');
      return;
    }

    setAuthScreenVisible(false);
    showError('');
    render();
  } catch (error) {
    console.error(error);
    setAuthScreenVisible(false);
    showError(`D24 could not load your records: ${error?.message || 'Unknown error'}`);
  }
}

async function changeRole(event) {
  if (!isOwner()) return;
  const select = event.currentTarget;
  const previous = state.profiles.find(profile => profile.id === select.dataset.memberId)?.role;
  if (select.dataset.memberId === state.user.id && select.value !== 'owner') {
    select.value = 'owner';
    showError('You cannot remove your own owner role from this screen.', '#admin-message');
    return;
  }

  $('#admin-message').textContent = 'Saving role…';
  const { error } = await d24Supabase.from('profiles').update({ role: select.value }).eq('id', select.dataset.memberId);
  if (error) {
    select.value = previous || 'member';
    $('#admin-message').textContent = `Role could not be changed: ${error.message}`;
    return;
  }
  $('#admin-message').textContent = 'Role updated successfully.';
  await loadData();
}

const loginForm = $('#login-form');
loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  setBusy(button, true, 'Signing in…');
  showError('');

  const { data, error } = await d24Supabase.auth.signInWithPassword({
    email: $('#login-email').value.trim(),
    password: $('#login-password').value
  });

  if (error) {
    showError(error.message);
    setBusy(button, false);
    return;
  }

  state.user = data.user;
  await loadData();
  setBusy(button, false);
});

const contributionForm = $('#contribution-form');
contributionForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isOfficer()) return alert('Only an owner or treasurer can record contributions.');

  const button = contributionForm.querySelector('.submit');
  const amount = Number($('#contribution-amount').value);
  const paidOn = $('#contribution-date').value;
  const memberId = $('#member-name').value;
  if (!amount || amount <= 0 || !paidOn || !memberId) return alert('Please enter a valid member, amount and payment date.');

  setBusy(button, true);
  const { error } = await d24Supabase.from('contributions').insert({
    member_id: memberId,
    amount,
    paid_on: paidOn,
    recorded_by: state.user.id
  });
  setBusy(button, false);
  if (error) return showToast(`Contribution was not saved: ${error.message}`, 'error');
  contributionForm.closest('dialog')?.close();
  showToast('Contribution recorded successfully.');
  await loadData();
});

const projectForm = $('#project-form');
projectForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = projectForm.querySelector('.submit');
  const title = $('#project-name').value.trim();
  const requestedAmount = Number($('#project-cost').value);
  const description = $('#project-description').value.trim();
  if (title.length < 3 || !requestedAmount || requestedAmount <= 0 || description.length < 10) {
    return alert('Please provide a project name, a valid amount, and a description of at least 10 characters.');
  }

  setBusy(button, true);
  const { error } = await d24Supabase.from('project_proposals').insert({ title, requested_amount: requestedAmount, description, proposed_by: state.user.id });
  setBusy(button, false);
  if (error) return showToast(`Proposal was not saved: ${error.message}`, 'error');
  projectForm.reset();
  projectForm.closest('dialog')?.close();
  showToast('Project proposal submitted.');
  await loadData();
});

async function castVote(vote) {
  const proposal = state.proposals[0];
  if (!proposal || proposal.status !== 'review') return;
  const button = vote ? $('#vote-yes') : $('#vote-no');
  setBusy(button, true, 'Saving…');
  const { error } = await d24Supabase.from('proposal_votes').upsert({ proposal_id: proposal.id, voter_id: state.user.id, vote }, { onConflict: 'proposal_id,voter_id' });
  setBusy(button, false);
  if (error) return showToast(`Vote was not saved: ${error.message}`, 'error');
  showToast('Your vote has been recorded.');
  await loadData();
}

$('#vote-yes')?.addEventListener('click', () => castVote(true));
$('#vote-no')?.addEventListener('click', () => castVote(false));

async function deleteProject(projectId) {
  if (!isOwner()) return alert('Only the owner can delete projects.');
  const project = state.proposals.find(item => String(item.id) === String(projectId));
  if (!project) return alert('Project could not be found.');
  const confirmed = window.confirm(`Delete the project proposal \"${project.title.replace(/\"/g, '\\"')}\"?\n\nThis will also remove all votes attached to it. This action cannot be undone.`);
  if (!confirmed) return;

  const button = document.querySelector(`[data-delete-project=\"${CSS.escape(String(projectId))}\"]`) || $('#delete-project');
  if (button) setBusy(button, true, 'Deleting…');

  const { error } = await d24Supabase.from('project_proposals').delete().eq('id', projectId);
  if (error) {
    if (button) setBusy(button, false);
    return showToast(`Project could not be deleted: ${error.message}`, 'error');
  }

  if (button) setBusy(button, false);
  showToast('Project deleted successfully.');
  await loadData();
}

$('#delete-project')?.addEventListener('click', () => {
  const proposal = state.proposals.find(item => item.status === 'review') || state.proposals[0];
  if (proposal) deleteProject(proposal.id);
});

$('#activity-list')?.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-project]');
  if (!button) return;
  deleteProject(button.dataset.deleteProject);
});

$('#approve-project')?.addEventListener('click', async () => {
  if (!isOfficer()) return;
  const proposal = state.proposals[0];
  if (!proposal) return;
  const yesVotes = state.votes.filter(vote => vote.proposal_id === proposal.id && vote.vote === true).length;
  const requiredVotes = Math.max(1, Math.ceil(state.profiles.length * 0.75));
  if (yesVotes < requiredVotes) return alert('This proposal has not reached the 75% approval threshold.');

  const button = $('#approve-project');
  setBusy(button, true, 'Approving…');
  const { error } = await d24Supabase.from('project_proposals').update({ status: 'approved' }).eq('id', proposal.id).eq('status', 'review');
  setBusy(button, false);
  if (error) return showToast(`Project could not be approved: ${error.message}`, 'error');
  showToast('Project approved successfully.');
  await loadData();
});

$('#export-ledger')?.addEventListener('click', () => {
  if (!state.user) return;
  const rows = [['Date', 'Member', 'Amount (KSh)', 'Recorded by']];
  state.contributions.forEach(item => {
    const member = state.profiles.find(profile => profile.id === item.member_id);
    const recorder = state.profiles.find(profile => profile.id === item.recorded_by);
    rows.push([item.paid_on, member?.display_name || member?.username || 'Unknown member', item.amount, recorder?.display_name || recorder?.username || 'Unknown officer']);
  });
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'D24-contribution-ledger.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

$('#notification-button')?.addEventListener('click', () => {
  renderNotifications();
  $('#notification-dialog')?.showModal();
});
$('#close-notifications')?.addEventListener('click', () => $('#notification-dialog')?.close());
$('#quick-export')?.addEventListener('click', () => $('#export-ledger')?.click());

$('#sign-out')?.addEventListener('click', async () => {
  const { error } = await d24Supabase.auth.signOut();
  if (error) return showToast(`Could not sign out: ${error.message}`, 'error');
  state.user = null;
  state.profile = null;
  state.profiles = [];
  state.contributions = [];
  state.proposals = [];
  state.votes = [];
  $('#auth-screen')?.classList.remove('hidden');
});

document.querySelectorAll('[data-open]').forEach(button => {
  button.addEventListener('click', () => {
    if (!state.user) return;
    const dialog = $(`#${button.dataset.open}`);
    if (dialog?.showModal) dialog.showModal();
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const target = $(link.getAttribute('href'));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const contributionDate = $('#contribution-date');
if (contributionDate) contributionDate.value = localDateISO(new Date());

function setAuthScreenVisible(visible) {
  $('#auth-screen')?.classList.toggle('hidden', !visible);
}

async function initializeApp() {
  setAuthScreenVisible(true);
  updateHeader();

  const { data, error } = await d24Supabase.auth.getSession();
  if (error) {
    showError(`Could not check your session: ${error.message}`);
    return;
  }

  if (data?.session?.user) {
    state.user = data.session.user;
    await loadData();
  }

  d24Supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      state.user = session.user;
      await loadData();
    } else {
      state.user = null;
      state.profile = null;
      setAuthScreenVisible(true);
      updateHeader();
    }
  });
}

initializeApp();
