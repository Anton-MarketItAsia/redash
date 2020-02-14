import { isNil, isNumber, isFinite, toString, invoke, extend } from "lodash";
import numeral from "numeral";
import { formatSimpleTemplate } from "@/lib/value-format";
import counterTypes from "./counterTypes";

function formatValue(value, { numberFormat, stringDecChar, stringThouSep }) {
  if (!isNumber(value)) {
    return toString(value);
  }

  // Temporarily update locale data (restore defaults after formatting)
  const locale = numeral.localeData();
  const savedDelimiters = locale.delimiters;

  if (stringDecChar || stringThouSep) {
    locale.delimiters = {
      thousands: stringThouSep,
      decimal: stringDecChar || ".",
    };
  }
  const result = numeral(value).format(numberFormat);

  locale.delimiters = savedDelimiters;
  return result;
}

function getCounterValue(rows, valueOptions, counterOptions) {
  const [value, additionalFields] = invoke(counterTypes[valueOptions.type], "getValue", rows, valueOptions);

  if (!valueOptions.show || isNil(value)) {
    return { value, display: null, tooltip: null };
  }

  const formatData = extend({}, additionalFields, {
    "@@value": toString(value),
    "@@value_formatted": isFinite(value) ? formatValue(value, counterOptions) : toString(value),
  });

  const display = formatSimpleTemplate(valueOptions.displayFormat, formatData);
  const tooltip = valueOptions.showTooltip ? formatSimpleTemplate(valueOptions.tooltipFormat, formatData) : null;

  return {
    value,
    display: display !== "" ? display : null,
    tooltip: tooltip !== "" ? tooltip : null,
  };
}

export function getCounterData(rows, options, visualizationName) {
  const result = {};
  const rowsCount = rows.length;

  // TODO: Revisit this condition
  const canRender =
    rowsCount > 0 || options.primaryValue.type === "countRows" || options.secondaryValue.type === "countRows";

  if (canRender) {
    result.counterLabel = toString(options.counterLabel);
    if (result.counterLabel === "") {
      result.counterLabel = visualizationName;
    }

    result.primaryValue = getCounterValue(rows, options.primaryValue, options);
    result.secondaryValue = getCounterValue(rows, options.secondaryValue, options);

    // TODO: Make this logic configurable
    result.showTrend = false;
    if (isFinite(result.primaryValue.value) && isFinite(result.secondaryValue.value)) {
      const delta = result.primaryValue.value - result.secondaryValue.value;
      result.showTrend = true;
      result.trendPositive = delta >= 0;
    }
  }

  return result;
}
