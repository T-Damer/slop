export const parkingImpactStyles = String.raw`
.parking-score-pop.is-group {
  color: #ffffff;
  padding: 5px 10px 6px;
  border-radius: 999px;
  background: rgba(40, 61, 57, .82);
  box-shadow: 0 4px 0 rgba(24, 43, 39, .25), 0 8px 18px rgba(24, 43, 39, .2);
  font-family: system-ui, sans-serif;
  font-size: 17px;
  letter-spacing: -.02em;
  text-shadow: none;
}

.parking-level-name {
  max-width: 180px;
}

@media (max-width: 560px) {
  .parking-score-pop.is-group {
    font-size: 15px;
  }
}
`;
