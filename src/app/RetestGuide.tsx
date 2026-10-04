import { Link } from "react-router-dom";

export default function RetestGuide() {
  return (
    <section aria-labelledby="retest-heading">
      <h2 id="retest-heading">When to retest</h2>
      <p>
        You do not need to repeat a successful test just because time has
        passed. Recheck the steps affected by a change.
      </p>
      <dl>
        <dt>The app or Bangla wording changes</dt>
        <dd>
          Repeat the affected steps after updating. If the SMS wording changes,
          have two independent native Bangla speakers review it and check the
          new message in a consented phone exchange.
        </dd>
        <dt>You use a different phone or carrier</dt>
        <dd>
          With a helper who agreed to the test, check that SMS messages arrive,
          Bangla displays clearly, and the offer, acceptance and acknowledgement
          can be exchanged. Keep Wi-Fi and mobile data off while testing SMS;
          cellular SMS service must remain available.
        </dd>
        <dt>Browser storage is cleared or offline files are missing</dt>
        <dd>
          Connect to the internet and <Link to="/">prepare offline files</Link>.
          Wait for “Ready for offline use”, close the app, turn off Wi-Fi and
          mobile data, and reopen it. Check that the app opens offline. Clearing
          storage can also remove saved requests and the test recipient; verify
          the recipient before another exchange.
        </dd>
      </dl>
      <p>
        Before travelling, use “Recheck offline files” to check the files on
        this device. A successful check does not require another SMS exchange.
      </p>
      <p>
        This guide does not mark tests complete or verify carrier delivery.
        Native Bangla review and broader basic-phone and human testing remain
        separate requirements.
      </p>
      <Link to="/outbox">Review your saved requests</Link>
    </section>
  );
}
